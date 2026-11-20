package vn.smartfarm.iot.control;
public interface CommandTransport {
    boolean controlConnected();
    /** PUMP01, contract v1. */
    void publishCommand(byte[] payload) throws Exception;
    /** Contract v3 actuators: smartfarm/FARM001/{actuatorId}/command. */
    default void publishActuatorCommand(String actuatorId, byte[] payload) throws Exception {
        throw new IllegalStateException("Actuator commands unavailable");
    }
    /** Contract v4: smartfarm/FARM001/ENV01/{config|ota}. */
    default void publishDeviceManagement(String kind, byte[] payload) throws Exception {
        throw new IllegalStateException("Device management unavailable");
    }
}
