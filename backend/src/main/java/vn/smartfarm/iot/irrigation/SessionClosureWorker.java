package vn.smartfarm.iot.irrigation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;import org.springframework.scheduling.annotation.*;import org.springframework.stereotype.Component;
@Component @EnableScheduling @ConditionalOnProperty(name="smartfarm.irrigation.session-closure-enabled",havingValue="true")
public class SessionClosureWorker {
 private final SessionClosure service;private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(SessionClosureWorker.class);
 public SessionClosureWorker(SessionClosure service){this.service=service;}
 @Scheduled(fixedDelayString="${smartfarm.irrigation.session-closure-poll-ms:1000}",initialDelayString="${smartfarm.irrigation.session-closure-poll-ms:1000}")
 public void poll(){try{service.poll();}catch(RuntimeException e){log.warn("SESSION_CLOSURE_EVALUATION_FAILED; inspect saved identities; no replay");}}
}
