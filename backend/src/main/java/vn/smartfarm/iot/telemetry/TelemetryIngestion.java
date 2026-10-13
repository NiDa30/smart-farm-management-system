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
public class TelemetryIngestion implements ApplicationRunner, DisposableBean {
    private static final Logger LOG = LoggerFactory.getLogger(TelemetryIngestion.class);
    private static final String TOPIC = "smartfarm/FARM001/ENV01/telemetry";
    private final TelemetryValidator validator;
    private final TelemetryRepository repository;
    private final ThreadPoolExecutor worker = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(128), runnable -> new Thread(runnable, "telemetry-storage"));
    private MqttClientConnection connection;

    public TelemetryIngestion(TelemetryValidator validator, TelemetryRepository repository) {
        this.validator = validator;
        this.repository = repository;
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
                .withProtocolOperationTimeoutMs(10000);
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
        connection.subscribe(TOPIC, QualityOfService.AT_LEAST_ONCE, message -> {
            byte[] payload = message.getPayload();
            if (payload.length > 4096) {
                LOG.warn("Telemetry rejected: payload exceeds 4096 bytes");
                return;
            }
            byte[] copy = Arrays.copyOf(payload, payload.length);
            try {
                worker.execute(() -> store(copy));
            } catch (RejectedExecutionException error) {
                LOG.error("Telemetry storage queue unavailable: message not persisted");
            }
        }).get(10, TimeUnit.SECONDS);
        LOG.info("MQTT_TELEMETRY_SUBSCRIBED {}", TOPIC);
    }

    private void store(byte[] payload) {
        final Telemetry value;
        try {
            value = validator.parse(payload);
        } catch (IllegalArgumentException error) {
            LOG.warn("Telemetry rejected: invalid v1 payload");
            return;
        }
        try {
            boolean inserted = repository.insert(value);
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
        try {
            if (connection != null) {
                try { connection.disconnect().get(5, TimeUnit.SECONDS); }
                finally { connection.close(); }
            }
        } finally {
            worker.shutdown();
            if (!worker.awaitTermination(5, TimeUnit.SECONDS)) worker.shutdownNow();
        }
    }
}
