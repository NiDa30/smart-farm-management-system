package vn.smartfarm.iot.irrigation;
import java.time.Instant;import java.util.UUID;
import org.junit.jupiter.api.Test;import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false","smartfarm.irrigation.demo-enabled=false"})
@AutoConfigureMockMvc @EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class IrrigationDisabledTest {
 @Autowired MockMvc mvc;
 @Test void flagOffNeverDispatches()throws Exception{mvc.perform(post("/api/v1/irrigation-demo/commands").contentType("application/json").content("{\"requestId\":\""+UUID.randomUUID()+"\",\"action\":\"CLOSE\",\"durationSeconds\":null,\"expectedBootId\":null,\"bindingRevision\":1,\"requestedAt\":\""+Instant.now()+"\"}")).andExpect(status().isForbidden());}
}
