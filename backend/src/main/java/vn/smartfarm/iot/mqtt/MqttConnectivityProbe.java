package vn.smartfarm.iot.mqtt;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import software.amazon.awssdk.iot.AwsIotMqttConnectionBuilder;
import software.amazon.awssdk.crt.mqtt.MqttClientConnection;
import software.amazon.awssdk.crt.mqtt.MqttMessage;
import software.amazon.awssdk.crt.mqtt.QualityOfService;
import software.amazon.awssdk.crt.http.HttpProxyOptions;

/** Read-only device observation plus a backend-owned echo, never an actuator command. */
public final class MqttConnectivityProbe {
    private static final String ECHO_TOPIC = "smartfarm/FARM001/backend/probe";
    private static final String TELEMETRY_TOPIC = "smartfarm/FARM001/ENV01/telemetry";

    static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing " + name);
        return value;
    }

    public static void main(String[] args) throws Exception {
        boolean selfTest = args.length == 1 && "--self-test".equals(args[0]);
        if (args.length > 0 && !selfTest) throw new IllegalArgumentException("Only --self-test is supported");
        String region = selfTest ? "ap-southeast-1" : required("AWS_REGION");
        String endpoint = selfTest ? "example-ats.iot.ap-southeast-1.amazonaws.com" : required("AWS_IOT_ENDPOINT");
        if (!endpoint.endsWith(".iot." + region + ".amazonaws.com") || endpoint.contains("/")) {
            throw new IllegalArgumentException("AWS_IOT_ENDPOINT must be a Data-ATS hostname in AWS_REGION");
        }
        int seconds = selfTest ? 0 : Integer.parseInt(System.getenv().getOrDefault("PROBE_SECONDS", "300"));
        if (seconds < 0 || seconds > 3600 || (!selfTest && seconds < 30)) {
            throw new IllegalArgumentException("PROBE_SECONDS must be between 30 and 3600");
        }
        // AWS CRT's native default credential provider chain is used; no credential values logged.
        try (AwsIotMqttConnectionBuilder builder = AwsIotMqttConnectionBuilder.newDefaultBuilder()) {
            builder.withEndpoint(endpoint)
                .withClientId("smartfarm-backend-FARM001")
                .withCleanSession(true)
                .withWebsockets(true)
                .withWebsocketSigningRegion(region)
                .withProtocolOperationTimeoutMs(10000);
            String proxyHost = System.getenv("AWS_IOT_PROXY_HOST");
            if (proxyHost != null && !proxyHost.isBlank()) {
                int port = Integer.parseInt(required("AWS_IOT_PROXY_PORT"));
                if (port < 1 || port > 65535 || proxyHost.contains("/") || proxyHost.contains("@")) {
                    throw new IllegalArgumentException("Invalid AWS IoT proxy hostname/port");
                }
                HttpProxyOptions proxy = new HttpProxyOptions();
                proxy.setHost(proxyHost);
                proxy.setPort(port);
                proxy.setConnectionType(HttpProxyOptions.HttpProxyConnectionType.Tunneling);
                builder.withHttpProxyOptions(proxy);
            }
            try (MqttClientConnection connection = builder.build()) {
                if (selfTest) {
                    System.out.println("CRT_NATIVE_BUILD_PASS (no AWS connection attempted)");
                    return;
                }
                AtomicInteger received = new AtomicInteger();
                String token = UUID.randomUUID().toString();
                CountDownLatch echo = new CountDownLatch(1);
                connection.connect().get(20, TimeUnit.SECONDS);
                try {
                    connection.subscribe(ECHO_TOPIC, QualityOfService.AT_LEAST_ONCE, msg -> {
                        if (token.equals(new String(msg.getPayload(), StandardCharsets.UTF_8))) echo.countDown();
                    }).get(10, TimeUnit.SECONDS);
                    connection.subscribe(TELEMETRY_TOPIC, QualityOfService.AT_LEAST_ONCE,
                        msg -> received.incrementAndGet()).get(10, TimeUnit.SECONDS);
                    connection.publish(new MqttMessage(ECHO_TOPIC, token.getBytes(StandardCharsets.UTF_8),
                        QualityOfService.AT_LEAST_ONCE, false)).get(10, TimeUnit.SECONDS);
                    if (!echo.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Backend echo not received");
                    System.out.println("WSS_PUBACK_ECHO_PASS; observing device telemetry for " + seconds + " seconds");
                    new CountDownLatch(1).await(seconds, TimeUnit.SECONDS);
                    System.out.println("TELEMETRY_PACKETS=" + received.get());
                    if (received.get() < seconds / 5 - 2) {
                        throw new IllegalStateException("Insufficient device telemetry; Day 1 AWS gate remains open");
                    }
                } finally {
                    connection.disconnect().get(10, TimeUnit.SECONDS);
                }
            }
        }
    }
}
