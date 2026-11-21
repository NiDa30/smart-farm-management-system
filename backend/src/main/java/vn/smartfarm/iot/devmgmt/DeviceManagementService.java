package vn.smartfarm.iot.devmgmt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.automation.IrrigationSequence;
import vn.smartfarm.iot.automation.WateringRule;
import vn.smartfarm.iot.control.ActuatorService;
import vn.smartfarm.iot.control.CommandTransport;
import vn.smartfarm.iot.control.PumpService;
import vn.smartfarm.iot.realtime.RealtimeNotifier;

/**
 * Remote configuration with ACK and signed OTA for ENV01 (contract v4). The device is the
 * authority: it validates, applies whole-or-nothing, verifies SHA-256 + ECDSA before switching
 * partitions and rolls back on its own. The backend only records requests and device evidence,
 * refuses what the device would refuse, and verifies release signatures before offering them.
 */
@Service
public class DeviceManagementService {
    public record Settings(Integer telemetrySeconds, Integer heartbeatSeconds, Integer soilWetAdc, Integer soilDryAdc, Integer pumpMaxSeconds) {}
    public record ConfigRequest(UUID configId, long revision, Settings settings, Instant issuedAt, String state, String errorCode, Long appliedRevision) {}
    public record DeviceState(long revision, Settings settings, String firmwareVersion, String partition, boolean otaTrial, Instant observedAt) {}
    public record ConfigView(boolean enabled, DeviceState device, List<ConfigRequest> requests) {}
    public record Release(String version, int size, String sha256, String signature, String url, Instant createdAt) {}
    public record ReleaseRequest(String version, Integer size, String sha256, String signature, String url) {}
    public record OtaJob(UUID otaId, String version, String fromVersion, Instant issuedAt, String state, Integer progress, String errorCode, Instant updatedAt) {}
    public record OtaView(boolean enabled, boolean signingKeyConfigured, String runningVersion, List<Release> releases, List<OtaJob> jobs) {}
    public record StartRequest(String version) {}

    private static final String UUID_PATTERN = "[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}";
    private static final String VERSION = "[0-9]+\\.[0-9]+\\.[0-9]+(-[a-z0-9]{1,8})?";
    static final Set<String> ACTIVE = Set.of("SENT", "PUBLISH_UNCERTAIN", "RECEIVED", "DOWNLOADING", "REBOOTING");
    /** Device stages and their order; a job never moves backwards or out of a final state. */
    private static final Map<String, Integer> RANK = Map.of("SENT", 0, "PUBLISH_UNCERTAIN", 0, "RECEIVED", 1, "DOWNLOADING", 2, "REBOOTING", 3,
        "REJECTED", 9, "FAILED", 9, "CONFIRMED", 9, "ROLLED_BACK", 9, "TIMED_OUT", 9);

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final ObjectProvider<CommandTransport> transports;
    private final boolean enabled;
    private final PublicKey releaseKey;
    private final String hostSuffix;
    private final PumpService pump;
    private final ActuatorService actuators;
    private final IrrigationSequence sequence;
    private final WateringRule rule;
    private final RealtimeNotifier realtime;

    public DeviceManagementService(JdbcTemplate jdbc, ObjectMapper mapper, ObjectProvider<CommandTransport> transports,
        @Value("${smartfarm.devmgmt.enabled:false}") boolean enabled, @Value("${smartfarm.ota.public-key:}") String publicKeyPem,
        @Value("${smartfarm.ota.host-suffix:.amazonaws.com}") String hostSuffix, PumpService pump, ActuatorService actuators,
        IrrigationSequence sequence, WateringRule rule, RealtimeNotifier realtime) {
        this.jdbc = jdbc;
        this.mapper = mapper.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        this.transports = transports;
        this.enabled = enabled;
        this.releaseKey = parseKey(publicKeyPem);
        this.hostSuffix = hostSuffix;
        this.pump = pump; this.actuators = actuators; this.sequence = sequence; this.rule = rule; this.realtime = realtime;
    }

    static PublicKey parseKey(String pem) {
        if (pem == null || pem.isBlank()) return null;
        try {
            String body = pem.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replaceAll("\\s|\\\\n", "");
            PublicKey key = KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(body)));
            if (!(key instanceof java.security.interfaces.ECPublicKey ec) || ec.getParams().getCurve().getField().getFieldSize() != 256)
                throw new IllegalArgumentException("OTA key must be ECDSA P-256");
            return key;
        } catch (IllegalArgumentException error) {
            throw error;
        } catch (Exception error) {
            throw new IllegalArgumentException("Invalid smartfarm.ota.public-key", error);
        }
    }

    public boolean enabled() { return enabled; }

    /** SHA-256 of the configured key (diagnostics only; the key is public). */
    String releaseKeyFingerprint() {
        try { return releaseKey == null ? "none" : HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(releaseKey.getEncoded())); }
        catch (Exception error) { return "unavailable"; }
    }

    // ---------------- configuration ----------------

    public static String validate(Settings s) {
        if (s == null || s.telemetrySeconds() == null || s.heartbeatSeconds() == null || s.soilWetAdc() == null || s.soilDryAdc() == null || s.pumpMaxSeconds() == null)
            return "All settings are required";
        if (s.telemetrySeconds() < 5 || s.telemetrySeconds() > 10) return "telemetrySeconds 5..10 (freshness window is 15 s)";
        if (s.heartbeatSeconds() < 5 || s.heartbeatSeconds() > 20) return "heartbeatSeconds 5..20 (offline after 30 s)";
        if (s.soilWetAdc() < 0 || s.soilWetAdc() > 4095 || s.soilDryAdc() < 0 || s.soilDryAdc() > 4095
            || Math.abs(s.soilDryAdc() - s.soilWetAdc()) < 200) return "Soil calibration 0..4095 with at least 200 between wet and dry";
        if (s.pumpMaxSeconds() < 1 || s.pumpMaxSeconds() > 3600) return "pumpMaxSeconds 1..3600";
        return null;
    }

    public ConfigView config() {
        expire();
        var requests = jdbc.query("SELECT * FROM device_config_request ORDER BY revision DESC LIMIT 10", (rs, n) -> new ConfigRequest(
            rs.getObject("config_id", UUID.class), rs.getLong("revision"), settings(rs.getString("settings")), rs.getTimestamp("issued_at").toInstant(),
            rs.getString("state"), rs.getString("error_code"), rs.getObject("applied_revision", Long.class)));
        return new ConfigView(enabled, device(), requests);
    }

    private DeviceState device() {
        return jdbc.query("SELECT * FROM device_config_state WHERE device_id='ENV01'", (rs, n) -> new DeviceState(rs.getLong("revision"),
            settings(rs.getString("settings")), rs.getString("firmware_version"), rs.getString("partition"), rs.getBoolean("ota_trial"),
            rs.getTimestamp("observed_at").toInstant())).stream().findFirst().orElse(null);
    }

    private Settings settings(String json) {
        try { return mapper.readValue(json, Settings.class); } catch (Exception error) { throw new IllegalStateException(error); }
    }

    private void expire() {
        jdbc.update("UPDATE device_config_request SET state='TIMED_OUT' WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND expires_at < CURRENT_TIMESTAMP - INTERVAL '10 seconds'");
        jdbc.update("""
            UPDATE ota_job SET state='TIMED_OUT',error_code='NO_DEVICE_REPORT',updated_at=CURRENT_TIMESTAMP
            WHERE (state IN ('SENT','PUBLISH_UNCERTAIN') AND expires_at < CURRENT_TIMESTAMP - INTERVAL '10 seconds')
               OR (state IN ('RECEIVED','DOWNLOADING') AND updated_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')
               OR (state='REBOOTING' AND updated_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes')
            """);
    }

    private CommandTransport transport() {
        if (!enabled) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Device management is disabled");
        var transport = transports.getIfAvailable();
        if (transport == null || !transport.controlConnected()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "MQTT unavailable");
        return transport;
    }

    public synchronized ConfigRequest requestConfig(Settings settings) {
        var transport = transport();
        String invalid = validate(settings);
        if (invalid != null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalid);
        expire();
        if (jdbc.queryForObject("SELECT COUNT(*) FROM device_config_request WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')", Integer.class) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wait for the previous configuration ACK");
        long revision = 1 + Math.max(jdbc.queryForObject("SELECT COALESCE(MAX(revision),0) FROM device_config_request", Long.class),
            jdbc.queryForObject("SELECT COALESCE(MAX(revision),0) FROM device_config_state", Long.class));
        UUID id = UUID.randomUUID();
        Instant issued = Instant.now().truncatedTo(ChronoUnit.SECONDS), expires = issued.plusSeconds(30);
        try {
            String json = mapper.writeValueAsString(settings);
            jdbc.update("INSERT INTO device_config_request(config_id,device_id,revision,settings,issued_at,expires_at,state) VALUES(?,'ENV01',?,?::jsonb,?,?,'PENDING')",
                id, revision, json, Timestamp.from(issued), Timestamp.from(expires));
            ObjectNode payload = mapper.createObjectNode();
            payload.put("schemaVersion", 1).put("configId", id.toString()).put("deviceId", "ENV01").put("revision", revision)
                .put("issuedAt", issued.toString()).put("expiresAt", expires.toString()).set("settings", mapper.valueToTree(settings));
            transport.publishDeviceManagement("config", mapper.writeValueAsBytes(payload));
            jdbc.update("UPDATE device_config_request SET state='SENT' WHERE config_id=? AND state='PENDING'", id);
        } catch (Exception error) {
            jdbc.update("UPDATE device_config_request SET state='PUBLISH_UNCERTAIN' WHERE config_id=? AND state='PENDING'", id);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Publish not confirmed; the device ignores stale revisions, so a new request is safe");
        } finally {
            realtime.publish("devices", "monitoring");
        }
        return config().requests().stream().filter(r -> r.configId().equals(id)).findFirst().orElseThrow();
    }

    // ---------------- OTA ----------------

    public OtaView ota() {
        expire();
        var releases = jdbc.query("SELECT * FROM firmware_release ORDER BY created_at DESC LIMIT 20", (rs, n) -> new Release(rs.getString("version"),
            rs.getInt("size"), rs.getString("sha256"), rs.getString("signature"), rs.getString("url"), rs.getTimestamp("created_at").toInstant()));
        var jobs = jdbc.query("SELECT * FROM ota_job ORDER BY issued_at DESC,updated_at DESC LIMIT 20", (rs, n) -> new OtaJob(rs.getObject("ota_id", UUID.class),
            rs.getString("version"), rs.getString("from_version"), rs.getTimestamp("issued_at").toInstant(), rs.getString("state"),
            rs.getObject("progress", Integer.class), rs.getString("error_code"), rs.getTimestamp("updated_at").toInstant()));
        var device = device();
        return new OtaView(enabled, releaseKey != null, device == null ? null : device.firmwareVersion(), releases, jobs);
    }

    /** Verifies the manifest signature (ECDSA P-256 over the image SHA-256) before storing it. */
    public synchronized Release register(ReleaseRequest request) {
        if (!enabled) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Device management is disabled");
        if (releaseKey == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No OTA public key configured (SMARTFARM_OTA_PUBLIC_KEY)");
        if (request == null || request.version() == null || !request.version().matches(VERSION) || request.version().length() > 23
            || request.size() == null || request.size() < 1024 || request.size() > 1310720
            || request.sha256() == null || !request.sha256().matches("[0-9a-f]{64}")
            || request.signature() == null || request.signature().length() < 80 || request.signature().length() > 200 || !allowedUrl(request.url()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid manifest (version, size, sha256, signature or https URL on " + hostSuffix + ")");
        if (!signatureValid(request.sha256(), request.signature()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature does not match the release key");
        try {
            jdbc.update("INSERT INTO firmware_release(version,size,sha256,signature,url) VALUES(?,?,?,?,?)",
                request.version(), request.size(), request.sha256(), request.signature(), request.url());
        } catch (org.springframework.dao.DuplicateKeyException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Release already registered; publish a new version instead");
        }
        realtime.publish("devices");
        return ota().releases().stream().filter(r -> r.version().equals(request.version())).findFirst().orElseThrow();
    }

    boolean allowedUrl(String url) {
        if (url == null || url.length() > 1024 || !url.startsWith("https://")) return false;
        String rest = url.substring(8);
        int slash = rest.indexOf('/');
        if (slash <= 0) return false;
        String host = rest.substring(0, slash);
        if (host.contains("@") || host.contains(":") || host.contains("\\") || !host.endsWith(hostSuffix) || host.length() <= hostSuffix.length()) return false;
        return url.chars().noneMatch(c -> c <= ' ' || c == '"' || c == '<' || c == '>');
    }

    boolean signatureValid(String sha256, String signatureB64) {
        try {
            Signature verifier = Signature.getInstance("NONEwithECDSA");  // input is already SHA-256(image)
            verifier.initVerify(releaseKey);
            verifier.update(HexFormat.of().parseHex(sha256));
            return verifier.verify(Base64.getDecoder().decode(signatureB64));
        } catch (Exception error) {
            return false;
        }
    }

    public synchronized OtaJob start(StartRequest request) {
        var transport = transport();
        if (releaseKey == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No OTA public key configured");
        expire();
        Release release = ota().releases().stream().filter(r -> request != null && r.version().equals(request.version())).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown release"));
        if (!signatureValid(release.sha256(), release.signature()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Stored release no longer matches the configured key");
        var device = device();
        if (device == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Device has not reported config-state (device management not active on ENV01)");
        if (device.otaTrial()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Device is still confirming the previous update");
        if (device.firmwareVersion().equals(release.version())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Device already runs " + release.version());
        // The device also refuses (ACTUATORS_ACTIVE) unless every output is OFF; fail early here.
        var pumpStatus = pump.status();
        if (!pumpStatus.fresh() || !pumpStatus.reportedState().equals("OFF"))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PUMP01 must report OFF");
        if (actuators.enabled() && actuators.overview().actuators().stream().anyMatch(a -> a.fresh() && !a.reportedState().equals("OFF")))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Every actuator must report OFF");
        if (sequence.view().current() != null || rule.state().enabled() || rule.state().activeCommand() != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Stop the zone sequence and disable the watering rule first");
        UUID id = UUID.randomUUID();
        Instant issued = Instant.now().truncatedTo(ChronoUnit.SECONDS), expires = issued.plusSeconds(30);
        try {
            jdbc.update("INSERT INTO ota_job(ota_id,version,from_version,issued_at,expires_at,state) VALUES(?,?,?,?,?,'SENT')",
                id, release.version(), device.firmwareVersion(), Timestamp.from(issued), Timestamp.from(expires));
        } catch (org.springframework.dao.DuplicateKeyException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An OTA is already in progress");
        }
        try {
            ObjectNode payload = mapper.createObjectNode();
            payload.put("schemaVersion", 1).put("otaId", id.toString()).put("deviceId", "ENV01").put("version", release.version())
                .put("url", release.url()).put("size", release.size()).put("sha256", release.sha256()).put("signature", release.signature())
                .put("issuedAt", issued.toString()).put("expiresAt", expires.toString());
            transport.publishDeviceManagement("ota", mapper.writeValueAsBytes(payload));
        } catch (Exception error) {
            jdbc.update("UPDATE ota_job SET state='PUBLISH_UNCERTAIN',updated_at=CURRENT_TIMESTAMP WHERE ota_id=?", id);
            realtime.publish("devices");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Publish not confirmed; the request expires in 30 s");
        }
        realtime.publish("devices");
        return ota().jobs().stream().filter(j -> j.otaId().equals(id)).findFirst().orElseThrow();
    }

    // ---------------- device messages ----------------

    public static boolean handles(String topic) {
        return topic != null && topic.matches("smartfarm/FARM001/ENV01/(config-ack|config-state|ota-status)");
    }

    public void receive(String topic, byte[] payload) {
        try {
            if (!handles(topic) || payload.length > 2048) throw new IllegalArgumentException();
            JsonNode node = mapper.readTree(payload);
            if (!node.isObject() || node.path("schemaVersion").asInt(-1) != 1 || !node.path("schemaVersion").isIntegralNumber()
                || !node.path("deviceId").asText().equals("ENV01") || !node.path("bootId").asText().matches(UUID_PATTERN)
                || !node.path("sequence").isIntegralNumber() || node.path("sequence").asLong() < 0) throw new IllegalArgumentException();
            Instant timestamp = Instant.parse(node.path("timestamp").asText());
            if (timestamp.isAfter(Instant.now().plusSeconds(2))) throw new IllegalArgumentException();
            String kind = topic.substring(topic.lastIndexOf('/') + 1);
            switch (kind) {
                case "config-ack" -> configAck(node);
                case "config-state" -> configState(node, timestamp);
                default -> otaStatus(node);
            }
            realtime.publish("devices", "monitoring");
        } catch (Exception error) {
            throw new IllegalArgumentException("Invalid device-management message", error);
        }
    }

    private void configAck(JsonNode node) {
        if (!node.path("configId").asText().matches(UUID_PATTERN) || !node.path("revision").isIntegralNumber()) throw new IllegalArgumentException();
        String status = node.path("status").asText();
        boolean applied = status.equals("APPLIED");
        if (!applied && !status.equals("REJECTED")) throw new IllegalArgumentException();
        String error = applied ? null : node.path("errorCode").isTextual() ? node.path("errorCode").asText() : "";
        if (!applied && (error.isBlank() || error.length() > 80)) throw new IllegalArgumentException();
        jdbc.update("""
            UPDATE device_config_request SET state=?,error_code=?,applied_revision=?,acknowledged_at=CURRENT_TIMESTAMP
            WHERE config_id=? AND state IN ('PENDING','SENT','PUBLISH_UNCERTAIN','TIMED_OUT')
            """, applied ? "APPLIED" : "REJECTED", error, node.path("revision").asLong(), UUID.fromString(node.path("configId").asText()));
    }

    private void configState(JsonNode node, Instant timestamp) throws Exception {
        Settings settings = mapper.treeToValue(node.path("settings"), Settings.class);
        String version = node.path("firmwareVersion").asText(), partition = node.path("partition").asText();
        if (validate(settings) != null || !node.path("revision").isIntegralNumber() || node.path("revision").asLong() < 0
            || version.length() < 5 || version.length() > 23 || partition.isEmpty() || partition.length() > 16 || !node.path("otaTrial").isBoolean())
            throw new IllegalArgumentException();
        jdbc.update("""
            INSERT INTO device_config_state(device_id,boot_id,sequence,observed_at,revision,settings,firmware_version,partition,ota_trial)
            VALUES('ENV01',?,?,?,?,?::jsonb,?,?,?)
            ON CONFLICT(device_id) DO UPDATE SET boot_id=EXCLUDED.boot_id,sequence=EXCLUDED.sequence,observed_at=EXCLUDED.observed_at,
              received_at=CURRENT_TIMESTAMP,revision=EXCLUDED.revision,settings=EXCLUDED.settings,firmware_version=EXCLUDED.firmware_version,
              partition=EXCLUDED.partition,ota_trial=EXCLUDED.ota_trial
            WHERE (EXCLUDED.boot_id=device_config_state.boot_id AND EXCLUDED.sequence>device_config_state.sequence)
               OR (EXCLUDED.boot_id<>device_config_state.boot_id AND EXCLUDED.observed_at>device_config_state.observed_at)
            """, UUID.fromString(node.path("bootId").asText()), node.path("sequence").asLong(), Timestamp.from(timestamp),
            node.path("revision").asLong(), mapper.writeValueAsString(settings), version, partition, node.path("otaTrial").asBoolean());
        // A confirmed image that reports itself after REBOOTING closes the job even if CONFIRMED was lost.
        if (!node.path("otaTrial").asBoolean())
            jdbc.update("UPDATE ota_job SET state='CONFIRMED',progress=100,updated_at=CURRENT_TIMESTAMP WHERE state='REBOOTING' AND version=?", version);
    }

    private void otaStatus(JsonNode node) {
        if (!node.path("otaId").asText().matches(UUID_PATTERN)) throw new IllegalArgumentException();
        String stage = node.path("stage").asText();
        if (!RANK.containsKey(stage) || stage.equals("SENT") || stage.equals("PUBLISH_UNCERTAIN") || stage.equals("TIMED_OUT")) throw new IllegalArgumentException();
        String error = node.path("errorCode").isNull() ? null : node.path("errorCode").isTextual() ? node.path("errorCode").asText() : "";
        if (error != null && (error.isBlank() || error.length() > 80)) throw new IllegalArgumentException();
        if (Set.of("REJECTED", "FAILED").contains(stage) && error == null) throw new IllegalArgumentException();
        Integer progress = node.path("progress").isIntegralNumber() ? node.path("progress").asInt() : null;
        if (progress != null && (progress < 0 || progress > 100)) throw new IllegalArgumentException();
        UUID id = UUID.fromString(node.path("otaId").asText());
        String current = jdbc.query("SELECT state FROM ota_job WHERE ota_id=?", (rs, n) -> rs.getString(1), id).stream().findFirst().orElse(null);
        if (current == null) throw new IllegalArgumentException();
        // Forward only; ROLLED_BACK may still follow CONFIRMED-less REBOOTING or a TIMED_OUT trial.
        boolean forward = RANK.get(stage) > RANK.get(current) || (stage.equals("DOWNLOADING") && current.equals("DOWNLOADING"))
            || (stage.equals("ROLLED_BACK") && Set.of("TIMED_OUT", "CONFIRMED").contains(current));
        if (!forward) return;
        jdbc.update("UPDATE ota_job SET state=?,progress=COALESCE(?,progress),error_code=?,updated_at=CURRENT_TIMESTAMP WHERE ota_id=?",
            stage, progress, error, id);
    }
}
