package vn.smartfarm.iot.control;
public interface CommandTransport {
    boolean controlConnected();
    void publishCommand(byte[] payload) throws Exception;
}
