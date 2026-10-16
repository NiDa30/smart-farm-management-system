package vn.smartfarm.iot.nodes;
import com.fasterxml.jackson.databind.ObjectMapper;import java.time.Instant;import java.util.*;
import org.springframework.beans.factory.annotation.Value;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-zones/{id}/weather/stops")
public class WeatherStopHistory {
 public record Item(UUID sessionId,String circuitId,UUID requestId,Instant createdAt,ZoneRainGate.View evidence,String operationState,String commandState,String errorCode) {}
 public record Page(String zoneId,Instant asOf,boolean workerEnabled,List<Item> items) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final boolean enabled;
 public WeatherStopHistory(JdbcTemplate jdbc,ObjectMapper mapper,@Value("${smartfarm.irrigation.rain-stop-enabled:false}")boolean enabled){this.jdbc=jdbc;this.mapper=mapper;this.enabled=enabled;}
 @GetMapping @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Page list(@PathVariable String id){ZoneRainGate.inspect(jdbc,id,Instant.now());var items=jdbc.query("SELECT w.*,s.circuit_id,a.state AS operation_state,p.state AS command_state,p.error_code FROM irrigation_weather_stop w JOIN irrigation_session s USING(session_id) JOIN irrigation_session_action a ON a.request_id=w.request_id LEFT JOIN pump_command p ON p.command_id=w.request_id WHERE w.zone_id=? ORDER BY w.created_at DESC,w.session_id DESC LIMIT 20",(r,n)->{ZoneRainGate.View evidence;try{evidence=mapper.readValue(r.getString("evidence"),ZoneRainGate.View.class);}catch(Exception e){throw new IllegalStateException("Invalid weather stop evidence");}return new Item(r.getObject("session_id",UUID.class),r.getString("circuit_id"),r.getObject("request_id",UUID.class),r.getTimestamp("created_at").toInstant(),evidence,r.getString("operation_state"),r.getString("command_state"),r.getString("error_code"));},id);return new Page(id,Instant.now(),enabled,items);}
}
