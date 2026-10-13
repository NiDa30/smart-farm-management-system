package vn.smartfarm.iot.telemetry;

import java.util.Arrays;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.crt.http.HttpProxyOptions;
import software.amazon.awssdk.crt.mqtt.MqttClientConnection;
import software.amazon.awssdk.crt.mqtt.QualityOfService;
import software.amazon.awssdk.iot.AwsIotMqttConnectionBuilder;

@Component
@ConditionalOnProperty(name = "smartfarm.mqtt.enabled", havingValue = "true")
public class TelemetryIngestion implements ApplicationRunner, DisposableBean, vn.smartfarm.iot.control.CommandTransport {
    private static final Logger LOG = LoggerFactory.getLogger(TelemetryIngestion.class);
    private static final String TOPIC = "smartfarm/FARM001/+/telemetry";
    private final TelemetryStorage storage;
    private final ThreadPoolExecutor worker = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(128), runnable -> new Thread(runnable, "telemetry-storage"));
    private final vn.smartfarm.iot.control.PumpService pump;
    private final boolean controlsEnabled;
    private final ThreadPoolExecutor controlWorker = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(32), runnable -> new Thread(runnable, "pump-control"));
    private MqttClientConnection connection;
    private volatile boolean controlReady, initialized, stopping;
    @Override public boolean controlConnected() { return controlReady && connection != null; }
    @Override public void publishCommand(byte[] payload) throws Exception {
        if (!controlConnected()) throw new IllegalStateException("Control unavailable");
        connection.publish(new software.amazon.awssdk.crt.mqtt.MqttMessage("smartfarm/FARM001/PUMP01/command",payload,
            QualityOfService.AT_LEAST_ONCE,false)).get(10,TimeUnit.SECONDS);
    }

    public TelemetryIngestion(TelemetryStorage storage, vn.smartfarm.iot.control.PumpService pump,
        @org.springframework.beans.factory.annotation.Value("${smartfarm.control.enabled:false}") boolean controlsEnabled) {
        this.storage = storage; this.pump=pump; this.controlsEnabled=controlsEnabled;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        String region = required("AWS_REGION");
        String endpoint = required("AWS_IOT_ENDPOINT");
        if (!endpoint.endsWith(".iot." + region + ".amazonaws.com") || endpoint.contains("/"))
            throw new IllegalArgumentException("Invalid IoT endpoint/region");
        try (var builder = AwsIotMqttConnectionBuilder.newDefaultBuilder()) {
            builder.withEndpoint(endpoint).withClientId("smartfarm-backend-FARM001")
                .withCleanSession(true).withWebsockets(true).withWebsocketSigningRegion(region)
                .withProtocolOperationTimeoutMs(10000)
                .withConnectionEventCallbacks(new software.amazon.awssdk.crt.mqtt.MqttClientConnectionEvents() {
                    public void onConnectionInterrupted(int error) { controlReady=false; LOG.warn("MQTT interrupted; command dispatch disabled"); }
                    public void onConnectionResumed(boolean present) {
                        if (!initialized || stopping) return;
                        if (present) { controlReady=controlsEnabled; return; }
                        try { controlWorker.execute(() -> {
                            try { subscribeStreams(); }
                            catch (Exception error) { controlReady=false; LOG.error("MQTT resubscribe failed; commands disabled until recovery/restart"); }
                        }); } catch (RejectedExecutionException error) { controlReady=false; }
                    }
                });
            String proxyHost = System.getenv("AWS_IOT_PROXY_HOST");
            if (proxyHost != null && !proxyHost.isBlank()) {
                int port = Integer.parseInt(required("AWS_IOT_PROXY_PORT"));
                if (port < 1 || port > 65535 || proxyHost.contains("/") || proxyHost.contains("@"))
                    throw new IllegalArgumentException("Invalid proxy");
                var proxy = new HttpProxyOptions();
                proxy.setHost(proxyHost);
                proxy.setPort(port);
                proxy.setConnectionType(HttpProxyOptions.HttpProxyConnectionType.Tunneling);
                builder.withHttpProxyOptions(proxy);
            }
            connection = builder.build();
        }
        connection.connect().get(20, TimeUnit.SECONDS);
        subscribeStreams();
        initialized=true;
    }

    private void subscribeStreams() throws Exception {
        connection.subscribe(TOPIC, QualityOfService.AT_LEAST_ONCE, message -> {
            byte[] payload = message.getPayload();
            if (payload.length > 4096) {
                LOG.warn("Telemetry rejected: payload exceeds 4096 bytes");
                return;
            }
            byte[] copy = Arrays.copyOf(payload, payload.length);
            try {
                worker.execute(() -> store(message.getTopic(), copy));
            } catch (RejectedExecutionException error) {
                LOG.error("Telemetry storage queue unavailable: message not persisted");
            }
        }).get(10, TimeUnit.SECONDS);
        if (controlsEnabled) for (String controlTopic : new String[]{"smartfarm/FARM001/PUMP01/status","smartfarm/FARM001/PUMP01/ack"}) {
            connection.subscribe(controlTopic,QualityOfService.AT_LEAST_ONCE,message -> {
                if (message.getRetain() || message.getPayload().length>4096) return;
                byte[] copy=Arrays.copyOf(message.getPayload(),message.getPayload().length);
                try { controlWorker.execute(() -> {
                    try { pump.receive(message.getTopic(),copy); }
                    catch (RuntimeException error) { LOG.warn("Pump message rejected or not persisted"); }
                }); } catch (RejectedExecutionException error) { LOG.error("Pump queue full; status/ACK not persisted"); }
            }).get(10,TimeUnit.SECONDS);
        }
        controlReady=controlsEnabled;
        LOG.info("MQTT_TELEMETRY_SUBSCRIBED {}; Wokwi control enabled={}", TOPIC, controlsEnabled);
    }

    private void store(String topic, byte[] payload) {
        final Telemetry value;
        try {
            value = storage.decodeRegistered(topic, payload);
        } catch (IllegalArgumentException error) {
            LOG.warn("Telemetry rejected: invalid v1 payload");
            return;
        } catch (RuntimeException error) {
            LOG.error("Telemetry registry lookup failed ({}): message not persisted", error.getClass().getSimpleName());
            return;
        }
        try {
            boolean inserted = storage.save(value);
            if (inserted) LOG.info("TELEMETRY_SAVED device={} sequence={}", value.deviceId(), value.sequence());
            else LOG.debug("Telemetry duplicate ignored");
        } catch (RuntimeException error) {
            LOG.error("Telemetry persistence failed ({}): message not persisted", error.getClass().getSimpleName());
        }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing " + name);
        return value;
    }
    @Override
    public void destroy() throws Exception {
        stopping=true; controlReady=false;
        try {
            if (connection != null) {
                try { connection.disconnect().get(5, TimeUnit.SECONDS); }
                finally { connection.close(); }
            }
        } finally {
            controlWorker.shutdown();
            if (!controlWorker.awaitTermination(5,TimeUnit.SECONDS)) controlWorker.shutdownNow();
            worker.shutdown();
            if (!worker.awaitTermination(5, TimeUnit.SECONDS)) worker.shutdownNow();
        }
    }
}
