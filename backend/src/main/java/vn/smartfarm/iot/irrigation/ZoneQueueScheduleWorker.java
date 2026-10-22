package vn.smartfarm.iot.irrigation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.stereotype.Component;
@Component @EnableScheduling @ConditionalOnProperty(name="smartfarm.irrigation.queue-schedule-enabled",havingValue="true")
public class ZoneQueueScheduleWorker {
 private final ZoneQueueSchedule service;
 public ZoneQueueScheduleWorker(ZoneQueueSchedule service){this.service=service;}
 @Scheduled(fixedDelayString="${smartfarm.irrigation.queue-schedule-poll-ms:1000}",initialDelayString="${smartfarm.irrigation.queue-schedule-initial-delay-ms:1000}")
 public void tick(){try{service.poll();}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Queue schedule evaluation failed ({})",e.getClass().getSimpleName());}}
}
