package vn.smartfarm.iot.irrigation;
import java.time.Instant;import java.util.UUID;
import org.junit.jupiter.api.Test;import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false","smartfarm.irrigation.circuit-demo-enabled=false"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class CircuitValveControlDisabledTest {
 @Autowired CircuitValveControl control;
 @Test void defaultProfileHasNoSubscriptionsAndCannotCreateCommands(){assertFalse(control.enabled());assertTrue(control.topics().isEmpty());assertEquals(403,assertThrows(ResponseStatusException.class,()->control.create("UNCONFIGURED",new CircuitValveControl.Request(UUID.randomUUID(),"OPEN",5,UUID.randomUUID(),1,1,Instant.now()))).getStatusCode().value());}
}
