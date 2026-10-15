package vn.smartfarm.iot.irrigation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;
@Component @EnableScheduling
@ConditionalOnProperty(name="smartfarm.irrigation-queue.scheduling-enabled",havingValue="true",matchIfMissing=true)
public class IrrigationQueueScheduler {
 private final IrrigationQueue queue;
 public IrrigationQueueScheduler(IrrigationQueue queue){this.queue=queue;}
 @Scheduled(fixedDelay=1000,initialDelay=1000) public void tick(){try{queue.maintain();}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Queue preview maintenance failed ({})",e.getClass().getSimpleName());}}
}
