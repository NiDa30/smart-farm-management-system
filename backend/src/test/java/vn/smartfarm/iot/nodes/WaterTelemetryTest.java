package vn.smartfarm.iot.nodes;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class WaterTelemetryTest {
 final ObjectMapper mapper=new ObjectMapper();final WaterTelemetry validator=new WaterTelemetry(mapper);
 ObjectNode sample() throws Exception {return (ObjectNode)mapper.readTree("""
 {"schemaVersion":2,"deviceId":"WATER01","bootId":"31000000-0000-4000-8000-000000000001","sequence":1,
 "timestamp":"%s","uptimeMs":1000,"readings":[
 {"channelId":"LOW","metric":"WATER_PRESENT","unit":"boolean","quality":"VALID","value":true,"calibrationVersion":null}]}
 """.formatted(Instant.now()));}
 WaterTelemetry.Packet parse(JsonNode node) throws Exception{return validator.parse(mapper.writeValueAsBytes(node));}
 ObjectNode reading(ObjectNode node){return (ObjectNode)node.path("readings").get(0);}
 @Test void preservesBinaryNumericZeroFaultAndPartialChannels() throws Exception {
  var node=sample();assertEquals(true,parse(node).readings().getFirst().value());
  reading(node).put("value",false);assertEquals(false,parse(node).readings().getFirst().value());
  reading(node).put("metric","FLOW_RATE").put("unit","L/min").put("value",0);assertEquals(0.0,parse(node).readings().getFirst().value());
  reading(node).put("quality","SENSOR_FAULT").putNull("value");assertNull(parse(node).readings().getFirst().value());
 }
 @Test void rejectsUnknownMissingDuplicateFieldsTrailingDataAndBadVersion() throws Exception {
  for(String field:List.of("schemaVersion","deviceId","bootId","sequence","timestamp","uptimeMs","readings")){
   var node=sample();node.remove(field);assertThrows(IllegalArgumentException.class,()->parse(node),field);
  }
  var node=sample();node.put("other",1);assertThrows(IllegalArgumentException.class,()->parse(node));
  String text=mapper.writeValueAsString(sample());
  for(String bad:List.of(text+"{}",text.replace("\"sequence\":1","\"sequence\":1,\"sequence\":2")))assertThrows(IllegalArgumentException.class,()->validator.parse(bad.getBytes()));
  for(int version:List.of(0,1,3)){var v=sample();v.put("schemaVersion",version);assertThrows(IllegalArgumentException.class,()->parse(v));}
  assertThrows(IllegalArgumentException.class,()->validator.parse(new byte[4097]));
 }
 @Test void rejectsCoercionBadQualityMetricUnitAndCalibration() throws Exception {
  for(String field:List.of("schemaVersion","sequence","uptimeMs")) {var n=sample();n.put(field,"1");assertThrows(IllegalArgumentException.class,()->parse(n));}
  for(String value:List.of("false","0")){var n=sample();reading(n).put("value",value);assertThrows(IllegalArgumentException.class,()->parse(n));}
  var n=sample();reading(n).putNull("value");assertThrows(IllegalArgumentException.class,()->parse(n));
  for(String field:List.of("metric","unit","quality")){var v=sample();reading(v).put(field,"unsupported");assertThrows(IllegalArgumentException.class,()->parse(v));}
  var fault=sample();reading(fault).put("quality","SENSOR_FAULT");assertThrows(IllegalArgumentException.class,()->parse(fault));
  var calibration=sample();reading(calibration).put("calibrationVersion",2);assertThrows(IllegalArgumentException.class,()->parse(calibration));
  var duplicate=sample();((com.fasterxml.jackson.databind.node.ArrayNode)duplicate.path("readings")).add(reading(duplicate).deepCopy());assertThrows(IllegalArgumentException.class,()->parse(duplicate));
 }
 @Test void rejectsFutureTimeBadIdsNegativeNonfiniteAndOutOfRangeReadings() throws Exception {
  for(String field:List.of("sequence","uptimeMs")){var n=sample();n.put(field,-1);assertThrows(IllegalArgumentException.class,()->parse(n));}
  var huge=sample();huge.put("sequence",9007199254740992L);assertThrows(IllegalArgumentException.class,()->parse(huge));
  var future=sample();future.put("timestamp",Instant.now().plusSeconds(60).toString());assertThrows(IllegalArgumentException.class,()->parse(future));
  var id=sample();id.put("deviceId","BAD/TOPIC");assertThrows(IllegalArgumentException.class,()->parse(id));
  for(String metric:List.of("FLOW_RATE","WATER_PRESSURE","WATER_TEMPERATURE")){
   var n=sample();reading(n).put("metric",metric).put("unit",WaterTelemetry.METRICS.get(metric).unit()).put("value",metric.equals("WATER_TEMPERATURE")?126:-1);assertThrows(IllegalArgumentException.class,()->parse(n));
  }
  var n=sample();reading(n).put("metric","FLOW_RATE").put("unit","L/min").put("value",Double.POSITIVE_INFINITY);assertThrows(IllegalArgumentException.class,()->parse(n));
 }
 @Test void acceptsFirmwareBuilderSampleAndKeepsProvenance() throws Exception {
  try(var stream=getClass().getResourceAsStream("/water-firmware-packet.json")){
   assertNotNull(stream);var node=(ObjectNode)mapper.readTree(stream);node.put("timestamp",Instant.now().toString());
   var parsed=parse(node);assertEquals("SIMULATOR",parsed.dataSource());assertEquals(6.0,parsed.readings().get(2).value());
   node.remove("dataSource");assertEquals("UNSPECIFIED",parse(node).dataSource());
   node.put("dataSource","UNKNOWN");assertThrows(IllegalArgumentException.class,()->parse(node));
   node.putNull("dataSource");assertThrows(IllegalArgumentException.class,()->parse(node));
  }
 }
}
