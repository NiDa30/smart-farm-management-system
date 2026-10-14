package vn.smartfarm.iot.nodes;
import java.time.*;
import java.sql.Timestamp;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class WaterVolumeTest {
 @Autowired WaterVolume volume;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
 final Instant start=Instant.parse("2026-01-01T00:00:00Z");final UUID boot=UUID.fromString("49000000-0000-4000-8000-000000000001");long commands,runs;
 @BeforeEach void setup(){
  jdbc.update("DELETE FROM iot_node WHERE node_id='VOLTEST'");
  jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES('VOLTEST','Volume test','AREA001','WATER',2)");
  jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES('VOLTEST','FLOW','FLOW_RATE','L/min'),('VOLTEST','LOW','WATER_PRESENT','boolean')");
  commands=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);runs=jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class);
 }
 @AfterEach void after(){assertEquals(commands,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));assertEquals(runs,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class));jdbc.update("DELETE FROM iot_node WHERE node_id='VOLTEST'");}
 void point(long seq,double seconds,Double flow,String quality,String source,String calibration,UUID boot, double delay){
  Instant at=start.plusNanos(Math.round(seconds*1e9));long id=jdbc.queryForObject("INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,received_at,uptime_ms,data_source) VALUES('VOLTEST',?,?,?,?,0,?) RETURNING id",Long.class,boot,seq,Timestamp.from(at),Timestamp.from(at.plusNanos(Math.round(delay*1e9))),source);
  if(quality!=null)jdbc.update("INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,number_value,calibration_version) VALUES(?,'VOLTEST','FLOW',?,?,?)",id,quality,flow,calibration);
 }
 void point(long seq,double seconds,double flow){point(seq,seconds,flow,"VALID","SIMULATOR","F1",boot,0);}
 WaterVolume.Report report(){return volume.estimate("VOLTEST","FLOW",start,start.plusSeconds(60),"SIMULATOR");}
 @Test void constantAndVariableFlowAreTrapezoidalAndBoundariesAreNotExtrapolated(){
  point(1,5,6);point(2,10,6);point(3,15,12);var r=report();assertEquals(.5+.75,r.estimatedLitres().doubleValue(),1e-10);assertEquals(10,r.coveredSeconds().doubleValue());assertEquals(50,r.uncoveredSeconds().doubleValue());assertEquals(2,r.acceptedIntervals());
 }
 @Test void zeroIsMeasuredVolumeAndNoIntervalsIsUnknown(){
  assertNull(report().estimatedLitres());point(1,0,0);assertNull(report().estimatedLitres());point(2,5,0);var r=report();assertEquals(0,r.estimatedLitres().doubleValue());assertEquals(1,r.acceptedIntervals());
 }
 @Test void partialPacketBreaksTheIntervalInsteadOfBeingRemovedByJoin(){
  point(1,0,6);point(2,5,null,null,"SIMULATOR","F1",boot,0);point(3,10,6);var r=report();assertNull(r.estimatedLitres());assertEquals(2,r.excluded().get("MISSING_CHANNEL"));assertEquals(3,r.packetCount());
 }
 @Test void sourceChangesAndOtherSourcePacketsAreNotBridged(){
  point(1,0,6);point(2,5,6.0,"VALID","PHYSICAL","F1",boot,0);point(3,10,6);var r=report();assertEquals(2,r.excluded().get("SOURCE_CHANGE"));assertEquals(2,r.sourcePacketCount());assertNull(r.estimatedLitres());
 }
 @Test void rebootSequenceGapAndLargeTimeGapAreExcluded(){
  point(1,0,6);point(3,5,6);point(4,21,6);point(5,22,6.0,"VALID","SIMULATOR","F1",UUID.randomUUID(),0);var r=report();assertEquals(Map.of("SEQUENCE_GAP",1,"TIME_GAP",1,"BOOT_CHANGE",1),r.excluded());
 }
 @Test void faultAndNullCannotBecomeZero(){
  point(1,0,6);point(2,5,null,"SENSOR_FAULT","SIMULATOR","F1",boot,0);point(3,10,6);assertNull(report().estimatedLitres());assertEquals(2,report().excluded().get("SENSOR_FAULT"));
 }
 @Test void equalTimestampsAndReversedSequenceAreNotIntegrated(){
  point(2,0,6);point(1,5,6);point(3,5,6);assertEquals(0,report().acceptedIntervals());
 }
 @Test void receiptSkewAndDelayedDeliveryAreNotConsideredReliable(){
  point(1,0,6.0,"VALID","SIMULATOR","F1",boot,-3);point(2,5,6);point(3,10,6.0,"VALID","SIMULATOR","F1",boot,31);var r=report();assertEquals(Map.of("CLOCK_SKEW",1,"RECEIPT_DELAY",1),r.excluded());
 }
 @Test void calibrationChangesSplitGroupsAndDisableCombinedTotal(){
  point(1,0,6);point(2,5,6);point(3,10,12.0,"VALID","SIMULATOR",null,boot,0);point(4,15,12.0,"VALID","SIMULATOR",null,boot,0);
  var r=report();assertNull(r.estimatedLitres());assertEquals(2,r.groups().size());assertEquals(.5,r.groups().getFirst().estimatedLitres().doubleValue());assertEquals(1,r.groups().getLast().estimatedLitres().doubleValue());assertNull(r.groups().getLast().calibrationVersion());assertEquals(1,r.excluded().get("CALIBRATION_CHANGE"));
 }
 @Test void subsecondIntervalsAndMaximumGapAreHandledWithoutRoundingToWholeSeconds(){
  point(1,.25,6);point(2,.75,6);point(3,15.75,6);var r=report();assertEquals(15.5,r.coveredSeconds().doubleValue());assertEquals(1.55,r.estimatedLitres().doubleValue(),1e-10);
 }
 @Test void exclusiveEndDoesNotUseAnOutsideSample(){
  point(1,55,6);point(2,60,6);assertEquals(1,report().packetCount());assertNull(report().estimatedLitres());
 }
 @Test void malformedRangeOrSourceIsRejectedAndNonFlowChannelIsNotFound() throws Exception {
  for(String source:new String[]{"ALL","", "simulator"})assertEquals(400,assertThrows(ResponseStatusException.class,()->volume.estimate("VOLTEST","FLOW",start,start.plusSeconds(60),source)).getStatusCode().value());
  assertThrows(ResponseStatusException.class,()->volume.estimate("VOLTEST","FLOW",start,start.plusSeconds(86401),"SIMULATOR"));
  assertThrows(ResponseStatusException.class,()->volume.estimate("VOLTEST","FLOW",start.plusNanos(1),start.plusSeconds(60),"SIMULATOR"));
  assertThrows(ResponseStatusException.class,()->volume.estimate("VOLTEST","FLOW",start,start,"SIMULATOR"));
  mvc.perform(get("/api/v1/nodes/VOLTEST/channels/LOW/water-volume").param("from",start.toString()).param("to",start.plusSeconds(60).toString()).param("dataSource","SIMULATOR")).andExpect(status().isNotFound());
  mvc.perform(get("/api/v1/nodes/VOLTEST/channels/FLOW/water-volume")).andExpect(status().isBadRequest());
 }
 @Test void tooManyPacketsRejectsTheWholeEstimateRatherThanTruncating(){
  jdbc.update("INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,received_at,uptime_ms,data_source) SELECT 'VOLTEST',?,i,?::timestamptz+i*INTERVAL '0.1 seconds',?::timestamptz+i*INTERVAL '0.1 seconds',0,'SIMULATOR' FROM generate_series(0,25000) i",boot,Timestamp.from(start),Timestamp.from(start));
  assertEquals(422,assertThrows(ResponseStatusException.class,()->volume.estimate("VOLTEST","FLOW",start,start.plusSeconds(3600),"SIMULATOR")).getStatusCode().value());
 }
 @Test void excessiveNumericValuesNeverBecomeInfinityInJson(){
  point(1,0,Double.MAX_VALUE);point(2,15,Double.MAX_VALUE);point(3,30,Double.MAX_VALUE);point(4,45,Double.MAX_VALUE);point(5,60,Double.MAX_VALUE);point(6,75,Double.MAX_VALUE);
  assertEquals(422,assertThrows(ResponseStatusException.class,()->volume.estimate("VOLTEST","FLOW",start,start.plusSeconds(80),"SIMULATOR")).getStatusCode().value());
 }
 @Test void jsonRetainsCoverageAndReadOnlyDoesNotCreateCommands() throws Exception {
  point(1,0,6);point(2,5,6);
  mvc.perform(get("/api/v1/nodes/VOLTEST/channels/FLOW/water-volume").param("from",start.toString()).param("to",start.plusSeconds(60).toString()).param("dataSource","SIMULATOR"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.estimatedLitres").value(.5)).andExpect(jsonPath("$.method").value("TRAPEZOID_V1")).andExpect(jsonPath("$.uncoveredSeconds").value(55));
 }
}
