package vn.smartfarm.iot.monitoring;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class MqttHealthTest {
 @Test void tracksConnectionRecoveryAndStop() {
  var health=new MqttHealth(true);assertEquals("STARTING",health.snapshot().state());
  health.connected();assertEquals("CONNECTED",health.snapshot().state());
  health.disconnected();assertEquals("DISCONNECTED",health.snapshot().state());
  health.connected();assertEquals("CONNECTED",health.snapshot().state());
  health.stopped();assertEquals("STOPPED",health.snapshot().state());
 }
 @Test void processingQueuedMessagesDoesNotClaimReconnection() {
  var health=new MqttHealth(true);health.connected();health.disconnected();health.messageProcessed();
  assertEquals("DISCONNECTED",health.snapshot().state());assertNotNull(health.snapshot().lastProcessedAt());
 }
 @Test void disabledRuntimeIgnoresConnectionAndMessageUpdates() {
  var health=new MqttHealth(false);health.connected();health.messageProcessed();health.disconnected();
  assertEquals("DISABLED",health.snapshot().state());assertNull(health.snapshot().lastProcessedAt());
 }
 @Test void lateSubscriptionCompletionCannotOverwriteDisconnection() {
  var health=new MqttHealth(true);long version=health.connectionVersion();
  health.disconnected();health.subscriptionsReady(version);assertEquals("DISCONNECTED",health.snapshot().state());
  health.reconnecting();health.subscriptionsReady(health.connectionVersion());assertEquals("CONNECTED",health.snapshot().state());
 }
 @Test void recentReceiptCannotTurnHistoricalOrFutureDataFresh() {
  Instant now=Instant.parse("2026-10-14T01:00:00Z");
  assertEquals("STALE",DeviceMonitoring.dataState(now.minusSeconds(60),now,now,30));
  assertEquals("RECENT",DeviceMonitoring.activity(now,now));
  assertEquals("CLOCK_SKEW",DeviceMonitoring.dataState(now.plusSeconds(3),now,now,30));
  assertEquals("CLOCK_SKEW",DeviceMonitoring.activity(now.plusSeconds(3),now));
  assertEquals("EMPTY",DeviceMonitoring.dataState(null,null,now,30));
  assertEquals("NEVER_SEEN",DeviceMonitoring.activity(null,now));
  assertEquals("STALE",DeviceMonitoring.dataState(now.minusSeconds(15),now,now,15));
  assertEquals("FRESH",DeviceMonitoring.dataState(now.minusSeconds(14),now,now,15));
 }
}
