package vn.smartfarm.iot.nodes;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

/** Water channels only; never coerce null/false/missing into a numeric zero. */
@Component
public class WaterTelemetry {
    public record Reading(String channelId,String metric,String unit,String quality,Object value,String calibrationVersion) {}
    public record Packet(String deviceId,UUID bootId,long sequence,Instant timestamp,long uptimeMs,List<Reading> readings) {}
    public record Metric(String unit,boolean binary,double minimum,double maximum) {}
    public static final Map<String,Metric> METRICS=Map.of(
        "WATER_PRESENT",new Metric("boolean",true,0,0),
        "FLOW_RATE",new Metric("L/min",false,0,Double.MAX_VALUE),
        "WATER_TEMPERATURE",new Metric("°C",false,-55,125),
        "WATER_PRESSURE",new Metric("kPa",false,0,Double.MAX_VALUE));
    private final ObjectMapper mapper;
    private static final Set<String> ENVELOPE=Set.of("schemaVersion","deviceId","bootId","sequence","timestamp","uptimeMs","readings");
    private static final Set<String> READING=Set.of("channelId","metric","unit","quality","value","calibrationVersion");
    public WaterTelemetry(ObjectMapper mapper) {
        this.mapper=mapper.copy().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    }
    public JsonNode object(byte[] bytes) {
        if(bytes.length==0||bytes.length>4096) throw new IllegalArgumentException("payload size");
        try {JsonNode node=mapper.readTree(bytes);if(!node.isObject())throw new IllegalArgumentException();return node;}
        catch(Exception error){throw new IllegalArgumentException("Invalid telemetry envelope");}
    }
    public static void fields(JsonNode node,Set<String> expected) {
        Set<String> actual=new HashSet<>();node.fieldNames().forEachRemaining(actual::add);
        if(!node.isObject()||!actual.equals(expected))throw new IllegalArgumentException("Invalid fields");
    }
    public static String text(JsonNode node,String field) {
        if(!node.path(field).isTextual())throw new IllegalArgumentException("Text required");return node.path(field).textValue();
    }
    public static String code(String value) {
        if(value==null||!value.matches("[A-Z][A-Z0-9_-]{1,31}"))throw new IllegalArgumentException("Invalid code");return value;
    }
    private static long integer(JsonNode node,String field) {
        JsonNode value=node.path(field);
        if(!value.isIntegralNumber()||!value.canConvertToLong()||value.longValue()<0||value.longValue()>9007199254740991L)throw new IllegalArgumentException("Integer required");
        return value.longValue();
    }
    public Packet parse(byte[] bytes) {
        try {
            JsonNode node=object(bytes);fields(node,ENVELOPE);
            if(integer(node,"schemaVersion")!=2)throw new IllegalArgumentException();
            String device=code(text(node,"deviceId")),boot=text(node,"bootId");
            if(!boot.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))throw new IllegalArgumentException();
            Instant timestamp=OffsetDateTime.parse(text(node,"timestamp")).toInstant();
            if(timestamp.isAfter(Instant.now().plusSeconds(2)))throw new IllegalArgumentException();
            JsonNode values=node.path("readings");
            if(!values.isArray()||values.isEmpty()||values.size()>8)throw new IllegalArgumentException();
            List<Reading> readings=new ArrayList<>();Set<String> ids=new HashSet<>();
            for(JsonNode value:values) {
                fields(value,READING);String id=code(text(value,"channelId"));
                if(!ids.add(id))throw new IllegalArgumentException();
                String metric=text(value,"metric"),unit=text(value,"unit"),quality=text(value,"quality");Metric definition=METRICS.get(metric);
                if(definition==null||!definition.unit().equals(unit))throw new IllegalArgumentException();
                JsonNode raw=value.get("value");Object reading=null;
                if(quality.equals("SENSOR_FAULT")) {if(!raw.isNull())throw new IllegalArgumentException();}
                else if(quality.equals("VALID")) {
                    if(definition.binary()) {if(!raw.isBoolean())throw new IllegalArgumentException();reading=raw.booleanValue();}
                    else {double n=raw.doubleValue();if(!raw.isNumber()||!Double.isFinite(n)||n<definition.minimum()||n>definition.maximum())throw new IllegalArgumentException();reading=n;}
                } else throw new IllegalArgumentException();
                JsonNode calibration=value.get("calibrationVersion");String version=null;
                if(!calibration.isNull()) {version=text(value,"calibrationVersion");if(version.isBlank()||version.length()>40)throw new IllegalArgumentException();}
                readings.add(new Reading(id,metric,unit,quality,reading,version));
            }
            return new Packet(device,UUID.fromString(boot),integer(node,"sequence"),timestamp,integer(node,"uptimeMs"),List.copyOf(readings));
        }catch(Exception error){throw new IllegalArgumentException("Invalid water telemetry v2");}
    }
}
