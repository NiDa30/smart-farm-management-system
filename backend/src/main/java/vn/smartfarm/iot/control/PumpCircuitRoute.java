package vn.smartfarm.iot.control;
import com.fasterxml.jackson.databind.*;import java.time.*;import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.http.HttpStatus;import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.irrigation.IrrigationCircuits;import vn.smartfarm.iot.nodes.WaterTelemetry;
/** Static simulator wiring declaration at the pump, not remote proof or a physical valve attestation. */
public record PumpCircuitRoute(String circuitId,int circuitRevision,String zoneId,int zoneRevision,String controllerId,String valveId) {
 public static PumpCircuitRoute parse(JsonNode p){WaterTelemetry.fields(p,Set.of("circuitId","circuitRevision","zoneId","zoneRevision","controllerId","valveId"));String circuit=WaterTelemetry.code(WaterTelemetry.text(p,"circuitId")),zone=WaterTelemetry.code(WaterTelemetry.text(p,"zoneId")),controller=WaterTelemetry.text(p,"controllerId"),valve=WaterTelemetry.text(p,"valveId");
  if(!controller.matches("IRRIGATION(0[2-9]|[1-9][0-9])")||!valve.matches("VALVE(0[2-9]|[1-9][0-9])"))throw new IllegalArgumentException("Circuit route IDs");return new PumpCircuitRoute(circuit,revision(p,"circuitRevision"),zone,revision(p,"zoneRevision"),controller,valve);}
 private static int revision(JsonNode p,String k){var v=p.path(k);if(!v.isIntegralNumber()||!v.canConvertToInt()||v.intValue()<1)throw new IllegalArgumentException("Route revision");return v.intValue();}
 public static PumpCircuitRoute from(IrrigationCircuits.Config c){return new PumpCircuitRoute(c.circuitId(),c.revision(),c.zoneId(),c.zoneRevision(),c.controllerId(),c.valveId());}
 public static PumpCircuitRoute stored(ObjectMapper mapper,String value){if(value==null)return null;try{return parse(mapper.readTree(value));}catch(Exception e){throw new IllegalArgumentException("Stored circuit route invalid",e);}}
 public record Check(String reason,Instant valveDeadline) {public boolean ready(){return reason.equals("READY");}}
 public static Check inspect(JdbcTemplate jdbc,ObjectMapper mapper,PumpCircuitRoute route,boolean reset){
  var rows=jdbc.queryForList("SELECT row_to_json(c)::text AS config FROM irrigation_circuit c WHERE circuit_id=?",route.circuitId());if(rows.isEmpty())return new Check("CIRCUIT_MISSING",null);
  IrrigationCircuits.Config c;try{var p=mapper.readTree((String)rows.getFirst().get("config"));c=new IrrigationCircuits.Config(p.path("circuit_id").asText(),p.path("name").asText(),p.path("zone_id").asText(),p.path("zone_revision").asInt(),p.path("controller_id").asText(),p.path("valve_id").asText(),p.path("pump_id").asText(),p.path("water_node_id").asText(),p.path("low_channel_id").asText(),p.path("flow_channel_id").asText(),p.path("expected_source").asText(),p.path("revision").asInt());}catch(Exception e){throw new IllegalStateException(e);}
  if(!from(c).equals(route)||!c.expectedSource().equals("SIMULATOR")||!c.pumpId().equals("PUMP01")||!IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT")||jdbc.queryForObject("SELECT count(*) FROM irrigation_circuit WHERE controller_id=?",Long.class,c.controllerId())!=1)return new Check("CIRCUIT_CHANGED",null);
  var pumps=jdbc.queryForList("SELECT *,valve_interlock::text AS proof FROM pump_status WHERE singleton=1");if(pumps.isEmpty())return new Check("PUMP_PROOF_MISSING",null);var pump=pumps.getFirst();Instant now=Instant.now();
  if(!fresh(pump,now))return new Check("PUMP_PROOF_STALE",null);
  if(pump.get("proof")==null)return new Check("PUMP_PROOF_MISSING",null);
  try{var proof=mapper.readTree((String)pump.get("proof"));if(proof==null||!proof.has("route")||!parse(proof.get("route")).equals(route))return new Check("PUMP_ROUTE_MISMATCH",null);if(!proof.path("state").asText().equals("OPEN")||!reset&&!proof.path("fault").isNull())return new Check("LOCAL_VALVE_NOT_OPEN",null);}catch(java.io.IOException e){throw new IllegalStateException(e);}
  var valves=jdbc.queryForList("SELECT s.*,s.position_feedback::text AS feedback FROM circuit_demo_status s WHERE valve_id=?",route.valveId());if(valves.isEmpty())return new Check("VALVE_STATUS_MISSING",null);var s=valves.getFirst();
  String config;try{config=mapper.writeValueAsString(c);}catch(Exception e){throw new IllegalStateException(e);}
  if(!fresh(s,now)||!Boolean.TRUE.equals(jdbc.queryForObject("SELECT config_snapshot=?::jsonb FROM circuit_demo_status WHERE valve_id=?",Boolean.class,config,route.valveId())))return new Check("VALVE_STATUS_STALE_OR_CHANGED",null);
  try{var f=mapper.readTree((String)s.get("feedback"));if(!s.get("gpio_state").equals("OPEN")||!Boolean.TRUE.equals(s.get("demo_enabled"))||!f.path("state").asText().equals("OPEN")||!f.path("fault").isNull())return new Check("REMOTE_VALVE_NOT_OPEN",null);}catch(Exception e){throw new IllegalStateException(e);}
  var commands=jdbc.query("SELECT issued_at,duration_seconds FROM circuit_demo_command WHERE valve_id=? AND boot_id=? AND ordinal=? AND config_snapshot=?::jsonb AND action='OPEN' AND state='EXECUTED' AND NOT EXISTS(SELECT 1 FROM circuit_demo_command later WHERE later.valve_id=? AND later.boot_id=? AND later.ordinal>?)",(r,n)->r.getTimestamp(1).toInstant().plusSeconds(r.getInt(2)-2),route.valveId(),s.get("boot_id"),s.get("last_ordinal"),config,route.valveId(),s.get("boot_id"),s.get("last_ordinal"));
  if(commands.isEmpty())return new Check("VALVE_COMMAND_UNCONFIRMED",null);
  long other=jdbc.queryForObject("""
    SELECT count(*) FROM irrigation_circuit c LEFT JOIN circuit_demo_status s ON s.valve_id=c.valve_id
    WHERE c.pump_id='PUMP01' AND c.circuit_id<>? AND NOT COALESCE(
      s.config_snapshot=jsonb_build_object('circuitId',c.circuit_id,'name',c.name,'zoneId',c.zone_id,'zoneRevision',c.zone_revision,'controllerId',c.controller_id,'valveId',c.valve_id,'pumpId',c.pump_id,'waterNodeId',c.water_node_id,'lowChannelId',c.low_channel_id,'flowChannelId',c.flow_channel_id,'expectedSource',c.expected_source,'revision',c.revision) AND s.gpio_state='CLOSED' AND s.position_feedback->>'state'='CLOSED' AND s.position_feedback->>'fault' IS NULL
      AND s.observed_at>CURRENT_TIMESTAMP-INTERVAL '15 seconds' AND s.received_at>CURRENT_TIMESTAMP-INTERVAL '15 seconds'
      AND s.observed_at<=CURRENT_TIMESTAMP+INTERVAL '2 seconds' AND s.received_at<=CURRENT_TIMESTAMP+INTERVAL '2 seconds'
      AND NOT EXISTS(SELECT 1 FROM circuit_demo_command q WHERE q.valve_id=c.valve_id AND q.boot_id=s.boot_id AND q.ordinal>s.last_ordinal),false)
    """,Long.class,route.circuitId());
  if(other>0)return new Check("OTHER_VALVE_NOT_CLOSED",null);
  return new Check("READY",commands.getFirst());
 }
 private static boolean fresh(Map<String,Object> s,Instant now){for(String k:List.of("observed_at","received_at")){var t=((java.sql.Timestamp)s.get(k)).toInstant();if(!t.isAfter(now.minusSeconds(15))||t.isAfter(now.plusSeconds(2)))return false;}return true;}
 /** Caller holds the circuit gate; shared pump dispatch also takes it before reservation. */
 public static void requireIdle(JdbcTemplate jdbc){
  boolean used=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pump_command WHERE circuit_route IS NOT NULL AND action='ON' AND owner_released_at IS NULL)",Boolean.class));
  if(used&&(new PumpOwnership(jdbc).view().blocked()||jdbc.queryForObject("SELECT count(*) FROM pump_command WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')",Long.class)>0))throw new ResponseStatusException(HttpStatus.CONFLICT,"Confirm pump OFF covering every command before moving or editing valves");
  if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM pump_status WHERE reported_state='ON' AND valve_interlock->'route' IS NOT NULL)",Boolean.class)))throw new ResponseStatusException(HttpStatus.CONFLICT,"Bound pump has not reported OFF");
 }
}
