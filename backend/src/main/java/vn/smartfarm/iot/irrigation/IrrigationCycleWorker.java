package vn.smartfarm.iot.irrigation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;import org.springframework.scheduling.annotation.*;import org.springframework.stereotype.Component;
@Component @EnableScheduling @ConditionalOnProperty(name="smartfarm.irrigation.cycle-enabled",havingValue="true")
public class IrrigationCycleWorker {
 private final IrrigationCycle service;public IrrigationCycleWorker(IrrigationCycle service){this.service=service;}
 @Scheduled(fixedDelayString="${smartfarm.irrigation.cycle-poll-ms:250}",initialDelayString="${smartfarm.irrigation.cycle-poll-ms:250}")
 public void tick(){try{service.poll();}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Cycle evaluation failed; inspect durable identities; no replay ({})",e.getClass().getSimpleName());}}
}
