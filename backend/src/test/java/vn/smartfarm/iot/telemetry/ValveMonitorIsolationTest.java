package vn.smartfarm.iot.telemetry;
import java.util.*;import java.util.concurrent.*;import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.crt.mqtt.*;
import vn.smartfarm.iot.irrigation.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
/** A stuck observation writer must not hold up the pump's ACK/status receiver. No broker/network. */
class ValveMonitorIsolationTest {
 @Test void blockedMonitorWriteDoesNotBlockPumpStatus()throws Exception{
  var monitor=mock(CircuitValveMonitor.class);var pump=mock(vn.smartfarm.iot.control.PumpService.class);var connection=mock(MqttClientConnection.class);
  var ingestion=new TelemetryIngestion(mock(vn.smartfarm.iot.nodes.TelemetryRouter.class),pump,mock(vn.smartfarm.iot.monitoring.MqttHealth.class),mock(IrrigationDemo.class),monitor,mock(CircuitValveControl.class),false,true);
  var callbacks=new HashMap<String,Consumer<MqttMessage>>();when(monitor.topics()).thenReturn(List.of("smartfarm/FARM001/VALVE02/status"));
  when(connection.subscribe(anyString(),any(QualityOfService.class),org.mockito.ArgumentMatchers.<Consumer<MqttMessage>>any())).thenAnswer(a->{callbacks.put(a.getArgument(0),a.getArgument(2));return CompletableFuture.completedFuture(1);});
  when(connection.disconnect()).thenReturn(CompletableFuture.completedFuture(null));
  var blocked=new CountDownLatch(1);var release=new CountDownLatch(1);var pumpReceived=new CountDownLatch(1);
  doAnswer(a->{blocked.countDown();if(!release.await(4,TimeUnit.SECONDS))throw new AssertionError("Monitor fixture release missing");return null;}).when(monitor).receive(anyString(),any(byte[].class),eq(false));
  doAnswer(a->{pumpReceived.countDown();return null;}).when(pump).receive(anyString(),any(byte[].class));
  try{
   var field=TelemetryIngestion.class.getDeclaredField("connection");field.setAccessible(true);field.set(ingestion,connection);
   var subscribe=TelemetryIngestion.class.getDeclaredMethod("subscribeStreams");subscribe.setAccessible(true);subscribe.invoke(ingestion);
   callbacks.get("smartfarm/FARM001/VALVE02/status").accept(new MqttMessage("smartfarm/FARM001/VALVE02/status",new byte[]{'{','}'},QualityOfService.AT_LEAST_ONCE,false));assertTrue(blocked.await(1,TimeUnit.SECONDS));
   callbacks.get("smartfarm/FARM001/PUMP01/status").accept(new MqttMessage("smartfarm/FARM001/PUMP01/status",new byte[]{'{','}'},QualityOfService.AT_LEAST_ONCE,false));assertTrue(pumpReceived.await(2,TimeUnit.SECONDS),"Pump status must process while monitor is still blocked");
   verify(connection,never()).publish(any(MqttMessage.class));
  }finally{release.countDown();ingestion.destroy();}
 }
}
