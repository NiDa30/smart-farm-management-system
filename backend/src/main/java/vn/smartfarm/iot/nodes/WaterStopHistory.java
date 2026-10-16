package vn.smartfarm.iot.nodes;
import com.fasterxml.jackson.databind.ObjectMapper;import java.time.Instant;import java.util.*;
import org.springframework.beans.factory.annotation.Value;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-circuits/{id}/water-gate/stops")
public class WaterStopHistory {
 public record Item(UUID sessionId,String circuitId,UUID requestId,Instant createdAt,CircuitWaterGate.View evidence,String operationState,String commandState,String errorCode) {}
 public record Page(String circuitId,Instant asOf,boolean workerEnabled,List<Item> items) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final boolean enabled;
 public WaterStopHistory(JdbcTemplate jdbc,ObjectMapper mapper,@Value("${smartfarm.irrigation.water-stop-enabled:false}")boolean enabled){this.jdbc=jdbc;this.mapper=mapper;this.enabled=enabled;}
 @GetMapping @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Page list(@PathVariable String id){CircuitWaterGate.inspect(jdbc,id,Instant.now());var items=jdbc.query("SELECT w.*,s.circuit_id,a.state AS operation_state,p.state AS command_state,p.error_code FROM irrigation_water_stop w JOIN irrigation_session s USING(session_id) JOIN irrigation_session_action a ON a.request_id=w.request_id LEFT JOIN pump_command p ON p.command_id=w.request_id WHERE w.circuit_id=? ORDER BY w.created_at DESC,w.session_id DESC LIMIT 20",(r,n)->{CircuitWaterGate.View evidence;try{evidence=mapper.readValue(r.getString("evidence"),CircuitWaterGate.View.class);}catch(Exception e){throw new IllegalStateException("Invalid water stop evidence");}return new Item(r.getObject("session_id",UUID.class),r.getString("circuit_id"),r.getObject("request_id",UUID.class),r.getTimestamp("created_at").toInstant(),evidence,r.getString("operation_state"),r.getString("command_state"),r.getString("error_code"));},id);return new Page(id,Instant.now(),enabled,items);}
}
