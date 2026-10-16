package vn.smartfarm.iot.irrigation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;
@Component @EnableScheduling
@ConditionalOnProperty(name="smartfarm.irrigation.flow-stop-enabled",havingValue="true")
public class FlowStopWorker {
 private final IrrigationSession sessions;
 private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(FlowStopWorker.class);
 public FlowStopWorker(IrrigationSession sessions){this.sessions=sessions;}
 @Scheduled(fixedDelayString="${smartfarm.irrigation.flow-stop-poll-ms:1000}",initialDelayString="${smartfarm.irrigation.flow-stop-poll-ms:1000}")
 public void poll(){try{sessions.stopForFlow();}catch(RuntimeException e){log.warn("FLOW_STOP_EVALUATION_FAILED; inspect stored session; no replay");}}
}
