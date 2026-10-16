package vn.smartfarm.iot.control;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;
import vn.smartfarm.iot.nodes.WaterTelemetry;
/** Reported local contacts at PUMP01, not remote valve identity or permission to dispatch. */
public record PumpValveInterlock(int version,boolean enabled,String dataSource,String state,String fault,@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) PumpCircuitRoute route) {
 public static final Set<String> FAULTS=Set.of("VALVE_NOT_OPEN","VALVE_PROOF_LOST","VALVE_SWITCH_CONFLICT");
 public static PumpValveInterlock parse(JsonNode n,String pumpState,boolean lock,String reason){
  WaterTelemetry.fields(n,n.has("route")?Set.of("version","enabled","dataSource","state","fault","route"):Set.of("version","enabled","dataSource","state","fault"));
  if(!n.path("version").isIntegralNumber()||!n.path("version").canConvertToInt()||n.path("version").intValue()!=1||!n.path("enabled").isBoolean()||!n.get("enabled").booleanValue()||!n.path("dataSource").isTextual()||!n.get("dataSource").textValue().equals("SIMULATOR")||!n.path("state").isTextual()||!Set.of("UNKNOWN","OPEN","CLOSED","CONFLICT").contains(n.get("state").textValue())||!(n.get("fault").isNull()||n.get("fault").isTextual()&&FAULTS.contains(n.get("fault").textValue())))throw new IllegalArgumentException("Invalid local valve proof");
  String state=n.get("state").textValue(),fault=n.get("fault").isNull()?null:n.get("fault").textValue();
  if(fault!=null&&(!pumpState.equals("OFF")||!lock)||pumpState.equals("ON")&&(!state.equals("OPEN")||fault!=null||lock)||FAULTS.contains(reason==null?"":reason)&&!reason.equals(fault)||"LOCKOUT_RESET".equals(reason)&&(fault!=null||!state.equals("OPEN")))throw new IllegalArgumentException("Inconsistent local valve proof/output");
  return new PumpValveInterlock(1,true,"SIMULATOR",state,fault,n.has("route")?PumpCircuitRoute.parse(n.get("route")):null);
 }
}
