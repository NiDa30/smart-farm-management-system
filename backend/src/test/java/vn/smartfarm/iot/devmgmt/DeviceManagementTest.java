package vn.smartfarm.iot.devmgmt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.CommandTransport;
import vn.smartfarm.iot.control.PumpService;
import vn.smartfarm.iot.devmgmt.DeviceManagementService.ReleaseRequest;
import vn.smartfarm.iot.devmgmt.DeviceManagementService.Settings;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
    "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true","smartfarm.devmgmt.enabled=true"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class DeviceManagementTest {
    static final KeyPair RELEASE = keys(), OTHER = keys();
    static KeyPair keys() {
        try { var g = KeyPairGenerator.getInstance("EC"); g.initialize(new ECGenParameterSpec("secp256r1")); return g.generateKeyPair(); }
        catch (Exception error) { throw new IllegalStateException(error); }
    }
    @DynamicPropertySource static void key(DynamicPropertyRegistry registry) {
        registry.add("smartfarm.ota.public-key", () -> pem(RELEASE));
    }

    @Autowired DeviceManagementService service;
    @Autowired PumpService pump;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @MockitoBean CommandTransport transport;
    final List<String[]> sent = new ArrayList<>();
    final String boot = "6a1e1f1e-1d50-4c51-8e7e-0d41b34e9a11";
    long seq = 1;

    static final Settings GOOD = new Settings(8, 15, 900, 3100, 600);
    final byte[] image = new byte[4096];

    @BeforeEach void setup() throws Exception {
        jdbc.execute("TRUNCATE ota_job,firmware_release,device_config_request,device_config_state,pump_command,pump_status,pump_state_history,watering_run,watering_rule");
        jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
        jdbc.execute("TRUNCATE irrigation_sequence CASCADE");
        reset(transport); sent.clear();
        when(transport.controlConnected()).thenReturn(true);
        doAnswer(i -> { sent.add(new String[]{i.getArgument(0), new String((byte[]) i.getArgument(1))}); return null; })
            .when(transport).publishDeviceManagement(anyString(), any());
        image[0] = (byte) 0xE9;
        for (int i = 1; i < image.length; i++) image[i] = (byte) (i * 31 + 7);
        pumpStatus("OFF");
    }

    void pumpStatus(String state) {
        pump.receive("smartfarm/FARM001/PUMP01/status", ("{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"bootId\":\"" + boot + "\",\"sequence\":" + (seq++)
            + ",\"timestamp\":\"" + Instant.now() + "\",\"connection\":\"ONLINE\",\"reportedState\":\"" + state + "\",\"safetyLockout\":false,"
            + "\"stateReason\":\"BOOT\",\"activeCommandId\":null}").getBytes());
    }
    String env(String body) {
        return "{\"schemaVersion\":1,\"deviceId\":\"ENV01\",\"bootId\":\"" + boot + "\",\"sequence\":" + (seq++) + ",\"timestamp\":\"" + Instant.now() + "\"," + body + "}";
    }
    void deviceState(long revision, String version, boolean trial) {
        service.receive("smartfarm/FARM001/ENV01/config-state", env("\"revision\":" + revision + ",\"settings\":{\"telemetrySeconds\":5,\"heartbeatSeconds\":10,"
            + "\"soilWetAdc\":0,\"soilDryAdc\":4095,\"pumpMaxSeconds\":3600},\"firmwareVersion\":\"" + version + "\",\"partition\":\"app0\",\"otaTrial\":" + trial).getBytes());
    }
    void otaStatus(String otaId, String stage, String error, Integer progress) {
        service.receive("smartfarm/FARM001/ENV01/ota-status", env("\"otaId\":\"" + otaId + "\",\"version\":\"1.4.0\",\"stage\":\"" + stage + "\",\"errorCode\":"
            + (error == null ? "null" : "\"" + error + "\"") + ",\"progress\":" + progress + ",\"firmwareVersion\":\"1.3.0\"").getBytes());
    }
    JsonNode last(String kind) throws Exception {
        for (int i = sent.size() - 1; i >= 0; i--) if (sent.get(i)[0].equals(kind)) return mapper.readTree(sent.get(i)[1]);
        fail("nothing sent to " + kind); return null;
    }
    int code(Runnable r) { return assertThrows(ResponseStatusException.class, r::run).getStatusCode().value(); }
    ReleaseRequest release(String version, KeyPair key) throws Exception {
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(image));
        Signature signer = Signature.getInstance("SHA256withECDSA");  // what sign_firmware.py does
        signer.initSign(key.getPrivate()); signer.update(image);
        return new ReleaseRequest(version, image.length, sha, Base64.getEncoder().encodeToString(signer.sign()),
            "https://smartfarm-fw.s3.ap-southeast-1.amazonaws.com/env01/" + version + ".bin?X-Amz-Signature=abc");
    }

    @Test void configIsValidatedSentWithANewRevisionAndAcknowledged() throws Exception {
        assertEquals(400, code(() -> service.requestConfig(new Settings(11, 15, 900, 3100, 600))));
        assertEquals(400, code(() -> service.requestConfig(new Settings(8, 21, 900, 3100, 600))));
        assertEquals(400, code(() -> service.requestConfig(new Settings(8, 15, 1000, 1100, 600))));
        assertEquals(400, code(() -> service.requestConfig(new Settings(8, 15, 900, 3100, 3601))));
        assertEquals(400, code(() -> service.requestConfig(new Settings(8, null, 900, 3100, 600))));
        deviceState(4, "1.3.0", false);
        var request = service.requestConfig(GOOD);
        assertEquals(5, request.revision(), "next revision after what the device reports");
        assertEquals("SENT", request.state());
        JsonNode wire = last("config");
        assertEquals(7, wire.size());
        assertEquals(5, wire.path("revision").asLong());
        assertEquals(600, wire.path("settings").path("pumpMaxSeconds").asInt());
        assertEquals(30, java.time.Duration.between(Instant.parse(wire.path("issuedAt").asText()), Instant.parse(wire.path("expiresAt").asText())).toSeconds());
        assertEquals(409, code(() -> service.requestConfig(GOOD)), "one request at a time");
        service.receive("smartfarm/FARM001/ENV01/config-ack", env("\"configId\":\"" + request.configId() + "\",\"status\":\"APPLIED\",\"errorCode\":null,\"revision\":5").getBytes());
        assertEquals("APPLIED", service.config().requests().getFirst().state());
        var next = service.requestConfig(new Settings(5, 10, 0, 4095, 3600));
        assertEquals(6, next.revision());
        service.receive("smartfarm/FARM001/ENV01/config-ack", env("\"configId\":\"" + next.configId() + "\",\"status\":\"REJECTED\",\"errorCode\":\"STALE_REVISION\",\"revision\":5").getBytes());
        var view = service.config().requests().getFirst();
        assertEquals("REJECTED", view.state()); assertEquals("STALE_REVISION", view.errorCode()); assertEquals(5L, view.appliedRevision());
        // Malformed device messages are refused.
        assertThrows(IllegalArgumentException.class, () -> service.receive("smartfarm/FARM001/ENV01/config-ack",
            env("\"configId\":\"" + next.configId() + "\",\"status\":\"REJECTED\",\"errorCode\":null,\"revision\":5").getBytes()));
        assertThrows(IllegalArgumentException.class, () -> service.receive("smartfarm/FARM001/PUMP01/config-ack", "{}".getBytes()));
        when(transport.controlConnected()).thenReturn(false);
        assertEquals(503, code(() -> service.requestConfig(GOOD)));
    }

    static String pem(KeyPair key) {
        return "-----BEGIN PUBLIC KEY-----\n" + Base64.getMimeEncoder().encodeToString(key.getPublic().getEncoded()) + "\n-----END PUBLIC KEY-----\n";
    }

    @Test void releasesNeedAValidSignatureFromTheConfiguredKey() throws Exception {
        var good = release("1.4.0", RELEASE);
        assertEquals(RELEASE.getPublic(), DeviceManagementService.parseKey(pem(RELEASE)), "PEM round trip");
        assertTrue(service.signatureValid(good.sha256(), good.signature()), "service key=" + service.releaseKeyFingerprint()
            + " expected=" + java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(RELEASE.getPublic().getEncoded())));
        assertEquals("1.4.0", service.register(good).version());
        assertEquals(409, code(() -> service.register(good)), "versions are immutable");
        assertEquals(400, code(() -> { try { service.register(release("1.4.1", OTHER)); } catch (Exception e) { throw new RuntimeException(e); } }));
        var tampered = new ReleaseRequest("1.4.2", good.size(), (good.sha256().charAt(0) == '0' ? "1" : "0") + good.sha256().substring(1), good.signature(), good.url());
        assertEquals(400, code(() -> service.register(tampered)));
        for (String url : List.of("http://x.amazonaws.com/a.bin", "https://evil.com/a.bin", "https://u@x.amazonaws.com/a.bin",
                                  "https://x.amazonaws.com:444/a.bin", "https://amazonaws.com.evil.com/a.bin", "https://x.amazonaws.com"))
            assertEquals(400, code(() -> service.register(new ReleaseRequest("1.4.3", good.size(), good.sha256(), good.signature(), url))), url);
        assertEquals(400, code(() -> service.register(new ReleaseRequest("v1.4", good.size(), good.sha256(), good.signature(), good.url()))));
        assertTrue(service.ota().signingKeyConfigured());
    }

    @Test void otaStartsOnlyWhenIdleAndFollowsDeviceStages() throws Exception {
        service.register(release("1.4.0", RELEASE));
        assertEquals(409, code(() -> service.start(new DeviceManagementService.StartRequest("1.4.0"))), "no config-state yet");
        deviceState(1, "1.4.0", false);
        assertEquals(409, code(() -> service.start(new DeviceManagementService.StartRequest("1.4.0"))), "already running it");
        deviceState(1, "1.3.0", false);
        pumpStatus("ON");
        assertEquals(409, code(() -> service.start(new DeviceManagementService.StartRequest("1.4.0"))), "pump running");
        pumpStatus("OFF");
        jdbc.update("UPDATE watering_rule SET enabled=true");
        assertEquals(409, code(() -> service.start(new DeviceManagementService.StartRequest("1.4.0"))), "rule enabled");
        jdbc.update("UPDATE watering_rule SET enabled=false");
        assertEquals(404, code(() -> service.start(new DeviceManagementService.StartRequest("9.9.9"))));
        var job = service.start(new DeviceManagementService.StartRequest("1.4.0"));
        assertEquals("SENT", job.state()); assertEquals("1.3.0", job.fromVersion());
        JsonNode wire = last("ota");
        assertEquals(10, wire.size());
        assertEquals("1.4.0", wire.path("version").asText());
        assertEquals(service.ota().releases().getFirst().signature(), wire.path("signature").asText());
        assertEquals(409, code(() -> service.start(new DeviceManagementService.StartRequest("1.4.0"))), "one OTA at a time");
        String id = job.otaId().toString();
        otaStatus(id, "RECEIVED", null, 0);
        otaStatus(id, "DOWNLOADING", null, 50);
        otaStatus(id, "RECEIVED", null, 0);  // late duplicate never moves backwards
        assertEquals("DOWNLOADING", service.ota().jobs().getFirst().state());
        assertEquals(50, service.ota().jobs().getFirst().progress());
        otaStatus(id, "REBOOTING", null, 100);
        deviceState(1, "1.4.0", true);       // trial boot: not confirmed yet
        assertEquals("REBOOTING", service.ota().jobs().getFirst().state());
        deviceState(1, "1.4.0", false);      // CONFIRMED lost, healthy report closes it
        assertEquals("CONFIRMED", service.ota().jobs().getFirst().state());
        otaStatus(id, "ROLLED_BACK", "TRIAL_FAILED", null);  // a later rollback report still wins
        assertEquals("ROLLED_BACK", service.ota().jobs().getFirst().state());
        assertThrows(IllegalArgumentException.class, () -> otaStatus(id, "FAILED", null, null), "failure needs an error code");
        assertThrows(IllegalArgumentException.class, () -> otaStatus("0a7f3b2e-58c1-4d1e-a0f4-6b9e2d7c4a35", "RECEIVED", null, 0), "unknown job");
    }

    @Test void deviceRejectionAndSilenceEndTheJob() throws Exception {
        service.register(release("1.4.0", RELEASE));
        deviceState(1, "1.3.0", false);
        var job = service.start(new DeviceManagementService.StartRequest("1.4.0"));
        otaStatus(job.otaId().toString(), "REJECTED", "ACTUATORS_ACTIVE", null);
        assertEquals("ACTUATORS_ACTIVE", service.ota().jobs().getFirst().errorCode());
        var again = service.start(new DeviceManagementService.StartRequest("1.4.0"));
        jdbc.update("UPDATE ota_job SET issued_at=CURRENT_TIMESTAMP-INTERVAL '60 seconds',expires_at=CURRENT_TIMESTAMP-INTERVAL '30 seconds' WHERE ota_id=?", again.otaId());
        assertEquals("TIMED_OUT", service.ota().jobs().stream().filter(j -> j.otaId().equals(again.otaId())).findFirst().orElseThrow().state());
        doThrow(new IllegalStateException("broker")).when(transport).publishDeviceManagement(anyString(), any());
        assertEquals(502, code(() -> service.start(new DeviceManagementService.StartRequest("1.4.0"))));
        assertEquals("PUBLISH_UNCERTAIN", service.ota().jobs().getFirst().state());
    }

    @Test void keyParsingRejectsWrongCurves() throws Exception {
        var g = KeyPairGenerator.getInstance("EC"); g.initialize(new ECGenParameterSpec("secp384r1"));
        String pem = "-----BEGIN PUBLIC KEY-----\n" + Base64.getMimeEncoder().encodeToString(g.generateKeyPair().getPublic().getEncoded()) + "\n-----END PUBLIC KEY-----";
        assertThrows(IllegalArgumentException.class, () -> DeviceManagementService.parseKey(pem));
        assertThrows(IllegalArgumentException.class, () -> DeviceManagementService.parseKey("-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----"));
        assertNull(DeviceManagementService.parseKey(""));
    }
}
