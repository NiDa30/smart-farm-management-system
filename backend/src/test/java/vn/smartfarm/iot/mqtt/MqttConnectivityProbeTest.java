package vn.smartfarm.iot.mqtt;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MqttConnectivityProbeTest {
    @Test
    void missingConfigurationFailsBeforeNetworkAccess() {
        assertThrows(IllegalArgumentException.class,
            () -> MqttConnectivityProbe.required("SMART_FARM_TEST_UNSET_VARIABLE"));
    }
}
