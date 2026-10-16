package vn.smartfarm.iot.control;
import com.fasterxml.jackson.databind.ObjectMapper;import java.time.Instant;
import org.springframework.beans.factory.ObjectProvider;import org.springframework.beans.factory.annotation.Value;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.*;
import org.springframework.web.bind.annotation.*;import vn.smartfarm.iot.irrigation.IrrigationCircuits;
@Service
public class PumpCircuitProof {
 public record View(IrrigationCircuits.Config config,PumpCircuitRoute route,Instant asOf,String reason,boolean connected,boolean readyToStart,boolean readyToReset,int maximumSeconds,PumpService.Status pump) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final PumpService pump;private final IrrigationCircuits circuits;private final ObjectProvider<CommandTransport> transport;private final boolean enabled;
 public PumpCircuitProof(JdbcTemplate jdbc,ObjectMapper mapper,PumpService pump,IrrigationCircuits circuits,ObjectProvider<CommandTransport> transport,@Value("${smartfarm.irrigation.circuit-demo-enabled:false}")boolean enabled){this.jdbc=jdbc;this.mapper=mapper;this.pump=pump;this.circuits=circuits;this.transport=transport;this.enabled=enabled;}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View snapshot(String id){var c=circuits.find(id);var r=PumpCircuitRoute.from(c);var s=pump.status();var f=s.commandFence();var now=Instant.now();var t=transport.getIfAvailable();boolean connected=t!=null&&t.controlConnected();var check=PumpCircuitRoute.inspect(jdbc,mapper,r,s.safetyLockout());
  String reason=!enabled||!s.controlEnabled()?"PROFILE_DISABLED":!f.required()||!f.compatible()?"PUMP_FENCE_REQUIRED":!connected?"PUMP_TRANSPORT_UNAVAILABLE":!s.fresh()||!s.reportedState().equals("OFF")?"PUMP_NOT_FRESH_OFF":f.restartRequired()?"PUMP_RESTART_REQUIRED":f.intent()==null||!f.intent().ready()?"INTENT_NOT_READY":f.ownership()!=null&&f.ownership().blocked()?"PUMP_OWNER_UNRESOLVED":jdbc.queryForObject("SELECT count(*) FROM pump_command WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') OR (target_boot_id=? AND fence_ordinal>?)",Long.class,f.intent().bootId(),f.lastOrdinal())>0?"PUMP_COMMAND_UNCONFIRMED":check.reason();
  // Two seconds on each device's clock bound the latest application of ON.
  int max=check.valveDeadline()==null?0:(int)Math.max(0,Math.min(30,java.time.Duration.between(now,check.valveDeadline()).getSeconds()-3));boolean ready=reason.equals("READY");
  if(ready&&!s.safetyLockout()&&max<1)reason="VALVE_WINDOW_TOO_SHORT";
  return new View(c,r,now,reason,connected,ready&&!s.safetyLockout()&&max>=1,ready&&s.safetyLockout(),max,s);
 }
}
@RestController
@RequestMapping("/api/v1/irrigation-circuits/{id}/pump-proof")
class PumpCircuitProofController {
 private final PumpCircuitProof proof;PumpCircuitProofController(PumpCircuitProof proof){this.proof=proof;}
 @GetMapping public PumpCircuitProof.View snapshot(@PathVariable String id){return proof.snapshot(id);}
}
