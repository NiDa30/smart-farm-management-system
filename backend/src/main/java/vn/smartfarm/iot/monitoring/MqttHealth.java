package vn.smartfarm.iot.monitoring;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Backend connection evidence only; never a device online/offline assertion. */
@Component
public class MqttHealth {
    public record Snapshot(String state, Instant changedAt, Instant lastProcessedAt) {}
    private final boolean enabled;
    private long connectionVersion;
    private final AtomicReference<Snapshot> state;
    public MqttHealth(@Value("${smartfarm.mqtt.enabled:false}") boolean enabled) {
        this.enabled=enabled;
        state=new AtomicReference<>(new Snapshot(enabled?"STARTING":"DISABLED",Instant.now(),null));
    }
    public Snapshot snapshot() { return state.get(); }
    private synchronized void transition(String target) {
        if (!enabled) return;
        if (!state.get().state().equals(target)) {
            connectionVersion++;
            state.updateAndGet(previous -> new Snapshot(target,Instant.now(),previous.lastProcessedAt()));
        }
    }
    public synchronized long connectionVersion() { return connectionVersion; }
    public void reconnecting() { transition("STARTING"); }
    public synchronized void subscriptionsReady(long expectedVersion) {
        if (connectionVersion==expectedVersion) transition("CONNECTED");
    }
    public void connected() { transition("CONNECTED"); }
    public void disconnected() { transition("DISCONNECTED"); }
    public void stopped() { transition("STOPPED"); }
    public void messageProcessed() {
        if (enabled) state.updateAndGet(previous -> new Snapshot(previous.state(),previous.changedAt(),Instant.now()));
    }
}
