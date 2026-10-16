package vn.smartfarm.iot.irrigation;
import java.util.UUID;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.http.HttpStatus;import org.springframework.web.server.ResponseStatusException;
/** Called inside the existing dispatch/config gates; never holds a lock across network IO. */
public final class IrrigationSessionGuard {
 private IrrigationSessionGuard(){}
 public static void editable(JdbcTemplate jdbc){if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_session WHERE phase<>'CLOSED_CONFIRMED')",Boolean.class)))throw conflict();}
 public static void valve(JdbcTemplate jdbc,UUID id,String action){String column=action.equals("OPEN")?"open_id":"close_id",phase=action.equals("OPEN")?"DISPATCHING_OPEN":"DISPATCHING_CLOSE";
  if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_session WHERE phase<>'CLOSED_CONFIRMED' AND NOT COALESCE("+column+"=? AND phase=? AND (NOT stop_requested OR ?='CLOSE'),false))",Boolean.class,id,phase,action)))throw conflict();
 }
 public static void pump(JdbcTemplate jdbc,UUID id,String action){
  if(action.equals("OFF")){jdbc.update("UPDATE irrigation_session SET stop_requested=true,phase='RECOVERY_REQUIRED',reason='EXTERNAL_OFF',revision=revision+1 WHERE phase<>'CLOSED_CONFIRMED' AND NOT COALESCE(off_id=? AND phase='DISPATCHING_OFF',false)",id);return;}
  if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_session WHERE phase<>'CLOSED_CONFIRMED' AND NOT COALESCE(on_id=? AND phase='DISPATCHING_ON' AND NOT stop_requested AND ?='ON',false))",Boolean.class,id,action)))throw conflict();
 }
 private static ResponseStatusException conflict(){return new ResponseStatusException(HttpStatus.CONFLICT,"Active irrigation session owns workflow; confirm its next step or request pump OFF");}
}
