package vn.smartfarm.iot.irrigation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;
@Component @EnableScheduling @ConditionalOnProperty(name="smartfarm.irrigation.queue-dispatch-enabled",havingValue="true")
public class IrrigationQueueDispatchWorker {
 private final IrrigationQueueDispatch service;
 public IrrigationQueueDispatchWorker(IrrigationQueueDispatch service){this.service=service;}
 @Scheduled(fixedDelayString="${smartfarm.irrigation.queue-dispatch-poll-ms:500}",initialDelayString="${smartfarm.irrigation.queue-dispatch-poll-ms:500}")
 public void tick(){try{service.poll();}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Queue dispatch transaction failed ({})",e.getClass().getSimpleName());}}
}
