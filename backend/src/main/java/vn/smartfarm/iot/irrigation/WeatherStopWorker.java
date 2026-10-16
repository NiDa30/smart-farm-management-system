package vn.smartfarm.iot.irrigation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.*;import org.springframework.stereotype.Component;
/** Opt-in process-side supervision; device timers/interlocks remain necessary when backend is down. */
@Component @EnableScheduling
@ConditionalOnProperty(name="smartfarm.irrigation.rain-stop-enabled",havingValue="true")
public class WeatherStopWorker {
 private final IrrigationSession sessions;
 private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(WeatherStopWorker.class);
 public WeatherStopWorker(IrrigationSession sessions){this.sessions=sessions;}
 @Scheduled(fixedDelayString="${smartfarm.irrigation.rain-stop-poll-ms:1000}",initialDelayString="${smartfarm.irrigation.rain-stop-poll-ms:1000}")
 public void poll(){try{sessions.stopForWeather();}catch(RuntimeException e){log.warn("WEATHER_STOP_EVALUATION_FAILED; inspect stored session; no replay");}}
}
