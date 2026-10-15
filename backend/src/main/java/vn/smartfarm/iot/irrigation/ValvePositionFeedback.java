package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;
import vn.smartfarm.iot.nodes.WaterTelemetry;

/** Optional independent simulated position inputs, never inferred from commanded GPIO. */
public record ValvePositionFeedback(int version,boolean enabled,String state,String fault) {
    static ValvePositionFeedback parse(JsonNode packet) {
        String reported=WaterTelemetry.text(packet,"feedbackState");
        if(!packet.has("positionFeedback")) {
            if(!reported.equals("UNKNOWN")||packet.path("reason").asText().equals("POSITION_FAULT"))throw new IllegalArgumentException("Unverified feedback");
            return null;
        }
        JsonNode f=packet.get("positionFeedback");WaterTelemetry.fields(f,Set.of("version","enabled","state","fault"));
        if(!f.path("version").isIntegralNumber()||!f.path("version").canConvertToInt()||f.path("version").intValue()!=1||!f.path("enabled").isBoolean()||!f.path("enabled").booleanValue()
            ||!Set.of("UNKNOWN","OPEN","CLOSED","CONFLICT").contains(reported)||!reported.equals(WaterTelemetry.text(f,"state")))throw new IllegalArgumentException("Invalid feedback capability/state");
        String fault=f.get("fault").isNull()?null:WaterTelemetry.text(f,"fault");
        if(fault!=null&&!Set.of("SWITCH_CONFLICT","OPEN_TIMEOUT","CLOSE_TIMEOUT","POSITION_LOST").contains(fault)
            ||reported.equals("CONFLICT")&&!"SWITCH_CONFLICT".equals(fault)
            ||fault!=null&&(!packet.path("gpioState").asText().equals("CLOSED")||!packet.path("reason").asText().equals("POSITION_FAULT"))
            ||fault==null&&packet.path("reason").asText().equals("POSITION_FAULT"))throw new IllegalArgumentException("Inconsistent position fault/output");
        return new ValvePositionFeedback(1,true,reported,fault);
    }
    public boolean closed(){return state.equals("CLOSED")&&fault==null;}
}
