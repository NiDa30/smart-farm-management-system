package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;
import vn.smartfarm.iot.nodes.WaterTelemetry;

/** Device-reported NVS journal, not attestation of flash or permission to resume. */
public record PumpDurableSafety(int version, boolean enabled, String storage, String state) {
    public static final Set<String> REASONS = Set.of("RESTART_LOCKOUT", "SAFETY_STORAGE_FAULT");
    public boolean locked() { return state.equals("LOCKED") || state.equals("STORAGE_FAULT"); }
    public static PumpDurableSafety parse(JsonNode n, String pumpState, boolean lock, String reason) {
        WaterTelemetry.fields(n, Set.of("version", "enabled", "storage", "state"));
        if (!n.path("version").isIntegralNumber() || !n.path("version").canConvertToInt() || n.get("version").intValue()!=1
            || !n.path("enabled").isBoolean() || !n.get("enabled").booleanValue()
            || !n.path("storage").isTextual() || !n.get("storage").textValue().equals("NVS")
            || !n.path("state").isTextual() || !Set.of("READY","ARMED","LOCKED","STORAGE_FAULT").contains(n.get("state").textValue()))
            throw new IllegalArgumentException("Invalid durable safety report");
        var result = new PumpDurableSafety(1,true,"NVS",n.get("state").textValue());
        // ARMED may already be OFF while the independent cutoff awaits loop settlement.
        if (result.locked() && (!pumpState.equals("OFF") || !lock)
            || !result.locked() && lock || pumpState.equals("ON") && !result.state.equals("ARMED")
            || "READY".equals(result.state) && !pumpState.equals("OFF")
            || "RESTART_LOCKOUT".equals(reason) && !result.state.equals("LOCKED")
            || "SAFETY_STORAGE_FAULT".equals(reason) && !result.state.equals("STORAGE_FAULT")
            || "LOCKOUT_RESET".equals(reason) && !result.state.equals("READY"))
            throw new IllegalArgumentException("Inconsistent durable safety/output");
        return result;
    }
}
