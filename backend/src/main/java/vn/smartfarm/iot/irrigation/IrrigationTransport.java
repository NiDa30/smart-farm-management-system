package vn.smartfarm.iot.irrigation;
public interface IrrigationTransport {
 boolean irrigationConnected();
 void publishIrrigation(byte[] payload)throws Exception;
}
