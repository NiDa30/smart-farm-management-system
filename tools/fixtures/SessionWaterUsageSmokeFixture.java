import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.control.*;
import vn.smartfarm.iot.irrigation.*;

/** Synthetic stored history only. No transport, packet publish or physical evidence. Never reseed. */
public class SessionWaterUsageSmokeFixture {
 public static void main(String[] args)throws Exception {
  String schema="session_water_usage_smoke";Path evidence=Path.of("/tmp/session-water-evidence.json");
  if(Files.exists(evidence))throw new IllegalStateException("Evidence exists; never replay fixture");
  var options=new ArrayList<String>(List.of("--spring.datasource.url=jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema,
   "--spring.datasource.username=smartfarm_test","--spring.datasource.password=","--spring.flyway.schemas="+schema,"--spring.flyway.default-schema="+schema,
   "--smartfarm.mqtt.enabled=false","--smartfarm.control.enabled=false","--smartfarm.control.pump-fencing-enabled=false","--smartfarm.control.circuit-route-required=false",
   "--smartfarm.irrigation-queue.scheduling-enabled=false"));
  for(String flag:List.of("session","session-closure","queue-handoff","flow-stop","water-stop","rain-stop","circuit-demo","demo","monitor"))options.add("--smartfarm.irrigation."+flag+"-enabled=false");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).run(options.toArray(String[]::new))){
   var jdbc=app.getBean(JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT count(*) FROM irrigation_session",Integer.class)!=0
    ||jdbc.queryForObject("SELECT count(*) FROM iot_node WHERE node_id='SWWATER'",Integer.class)!=0||app.getBeanNamesForType(CommandTransport.class).length!=0||app.getBeanNamesForType(CircuitValveTransport.class).length!=0)throw new IllegalStateException("Reseed/real transport forbidden");
   var base=Instant.now().minusSeconds(120).truncatedTo(ChronoUnit.MICROS);var boot=UUID.randomUUID();var session=UUID.randomUUID();var on=UUID.randomUUID();var off=UUID.randomUUID();
   var config=new IrrigationCircuits.Config("SW1","Phiên mẫu báo cáo nước","SWZONE",1,"IRRIGATION66","VALVE66","PUMP01","SWWATER","LOW","FLOW","SIMULATOR",1);
   jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES('SWWATER','Trạm mẫu báo cáo','AREA001','WATER',2)");
   jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit,calibration_version) VALUES('SWWATER','FLOW','FLOW_RATE','L/min','F1')");
   jdbc.update("INSERT INTO irrigation_session(session_id,circuit_id,config_snapshot,pump_boot,valve_boot,duration_seconds,requested_at,created_at,phase,reason,stop_requested,on_id,off_id,finished_at) VALUES(?,'SW1',?::jsonb,?,?,10,?,?,'CLOSED_CONFIRMED','SYNTHETIC_HISTORY',true,?,?,?)",session,mapper.writeValueAsString(config),boot,boot,Timestamp.from(base),Timestamp.from(base),on,off,Timestamp.from(base.plusSeconds(12)));
   for(String step:List.of("ON","OFF")){
    var id=step.equals("ON")?on:off;var at=step.equals("ON")?base:base.plusSeconds(10);var route=step.equals("ON")?PumpCircuitRoute.from(config):null;
    var intent=new PumpCommandFencing.HttpIntent(id,step,step.equals("ON")?10:null,step.equals("ON")?boot:null,1L,at,route);
    jdbc.update("INSERT INTO irrigation_session_action(request_id,session_id,action,definition,payload,state,created_at) VALUES(?,?,?,?::jsonb,?::jsonb,'RETURNED',?)",id,session,step,mapper.writeValueAsString(new IrrigationSession.Action(id,step,1,at)),mapper.writeValueAsString(intent),Timestamp.from(at));
    jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,reported_state,fence_ordinal,target_boot_id,http_intent_revision,http_reviewed_at,http_expected_boot,circuit_route,acknowledged_at,ack_boot_id,ack_sequence) VALUES(?,?,?,?,?,'EXECUTED',?,nextval('pump_fence_ordinal_seq'),?,1,?,?,?::jsonb,?,?,1)",id,step,step.equals("ON")?10:null,Timestamp.from(at),Timestamp.from(at.plusSeconds(10)),step,boot,Timestamp.from(at),step.equals("ON")?boot:null,route==null?null:mapper.writeValueAsString(route),Timestamp.from(at.plusSeconds(1)),boot);
   }
   for(int i=0;i<2;i++){
    var at=base.plusSeconds(1+i*5);long id=jdbc.queryForObject("INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,received_at,uptime_ms,data_source) VALUES('SWWATER',?,?,?,?,0,'SIMULATOR') RETURNING id",Long.class,boot,i,Timestamp.from(at),Timestamp.from(at));
    jdbc.update("INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,number_value,calibration_version) VALUES(?,'SWWATER','FLOW','VALID',6,'F1')",id);
   }
   var result=app.getBean(SessionWaterUsage.class).read("SW1",session);
   if(!result.state().equals("ESTIMATED")||result.volume().estimatedLitres().doubleValue()!=.5||result.volume().coveredSeconds().doubleValue()!=5||result.volume().uncoveredSeconds().doubleValue()!=5)throw new AssertionError("Expected partial .5 L station estimate");
   Files.writeString(evidence,mapper.writeValueAsString(result),StandardOpenOption.CREATE_NEW);
   System.out.println("PASS stored synthetic history -> .5L / 5s covered / 5s uncovered; no transport");
  }
 }
}
