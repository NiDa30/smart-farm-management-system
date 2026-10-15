package vn.smartfarm.iot.irrigation;
public interface CircuitValveTransport {
 boolean circuitValveConnected(String valveId);
 void publishCircuitValve(String valveId,byte[] payload)throws Exception;
}
