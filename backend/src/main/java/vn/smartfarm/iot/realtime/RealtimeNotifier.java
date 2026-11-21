package vn.smartfarm.iot.realtime;

import java.util.Set;

/**
 * Change notifications for browsers. Only topic names travel on the socket: clients refetch
 * through the existing REST API, so the socket never becomes a second source of state.
 */
public interface RealtimeNotifier {
    Set<String> TOPICS = Set.of("telemetry", "nodes", "pump", "commands", "alerts", "automation",
        "monitoring", "events", "safety", "dashboard", "actuators");

    /** Sent after the surrounding transaction commits; immediately when there is none. */
    void publish(String... topics);

    RealtimeNotifier NONE = topics -> {};

    default void telemetryStored() { publish("telemetry", "alerts", "monitoring", "events", "automation", "dashboard"); }
    default void waterStored() { publish("nodes", "alerts", "monitoring", "dashboard"); }
    default void nodesChanged() { publish("nodes", "monitoring", "dashboard"); }
    default void pumpChanged() { publish("pump", "commands", "events", "monitoring", "safety", "automation", "dashboard"); }
    default void commandChanged() { publish("commands", "events", "safety", "automation", "dashboard"); }
    default void alertsChanged() { publish("alerts", "events", "monitoring", "dashboard"); }
    default void automationChanged() { publish("automation", "events", "safety", "dashboard"); }
    default void actuatorsChanged() { publish("actuators", "automation", "safety", "dashboard"); }
}
