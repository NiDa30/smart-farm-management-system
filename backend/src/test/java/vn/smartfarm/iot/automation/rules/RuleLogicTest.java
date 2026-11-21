package vn.smartfarm.iot.automation.rules;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.smartfarm.iot.automation.rules.RuleEvaluator.Outcome;
import vn.smartfarm.iot.automation.rules.RuleEvaluator.Sample;
import static org.junit.jupiter.api.Assertions.*;

class RuleLogicTest {
    static final ObjectMapper JSON = new ObjectMapper();
    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final RuleDefinition.Catalog CATALOG = new RuleDefinition.Catalog() {
        public String metric(String node, String channel) {
            return Map.of("ENV01/AIR_TEMP", "AIR_TEMPERATURE", "ENV01/SOIL", "SOIL_MOISTURE", "WATER01/LOW", "WATER_PRESENT").get(node + "/" + channel);
        }
        public Integer actuatorCap(String id) { return Map.of("FAN01", 14400, "MIST01", 600, "VALVE01", 3600, "VALVE02", 3600).get(id); }
        public String actuatorType(String id) { return Map.of("FAN01", "FAN", "MIST01", "MIST", "VALVE01", "VALVE", "VALVE02", "VALVE", "PUMP01", "PUMP").get(id); }
        public boolean knownActuator(String id) { return actuatorType(id) != null; }
    };
    static JsonNode json(String text) { try { return JSON.readTree(text.replace('\'', '"')); } catch (Exception e) { throw new IllegalStateException(e); } }
    static RuleDefinition parse(String text) { return RuleDefinition.parse(json(text), CATALOG); }
    static String hot(String extra) {
        return "{'conditions':{'op':'ALL','items':[{'type':'SENSOR','nodeId':'ENV01','channelId':'AIR_TEMP','comparator':'GT','value':32,'forSeconds':60}" + extra + "]},"
            + "'actions':[{'type':'ACTUATOR','actuatorId':'FAN01','action':'ON','durationSeconds':600}],'cooldownSeconds':900,'maxRunsPerDay':6,'manualHoldSeconds':600}";
    }

    @Test void validDefinitionsParseAndExposeTargets() {
        var rule = parse(hot(",{'op':'ANY','items':[{'type':'TIME','start':'22:00','end':'06:00','days':[1,2,3,4,5,6,7]},{'type':'ACTUATOR_STATE','actuatorId':'PUMP01','state':'OFF'}]}"));
        assertEquals(java.util.Set.of("FAN01"), rule.targets());
        var zones = parse("{'conditions':{'op':'ALL','items':[{'type':'SENSOR','nodeId':'ENV01','channelId':'SOIL','comparator':'LT','value':30,'forSeconds':0}]},"
            + "'actions':[{'type':'ACTUATOR','actuatorId':'MIST01','action':'OFF'},{'type':'ZONE_SEQUENCE','zones':[{'valveId':'VALVE01','pumpSeconds':120},{'valveId':'VALVE02','pumpSeconds':60}]}],"
            + "'cooldownSeconds':3600,'maxRunsPerDay':2,'manualHoldSeconds':0}");
        assertEquals(java.util.Set.of("MIST01", "VALVE01", "VALVE02", "PUMP01"), zones.targets());
    }

    @Test void unsafeOrMalformedDefinitionsAreRefused() {
        String sensor = "{'type':'SENSOR','nodeId':'ENV01','channelId':'AIR_TEMP','comparator':'GT','value':32,'forSeconds':0}";
        String fan = "{'type':'ACTUATOR','actuatorId':'FAN01','action':'ON','durationSeconds':600}";
        List<String> bad = List.of(
            "{'conditions':{'op':'ALL','items':[" + sensor + "]},'actions':[{'type':'ACTUATOR','actuatorId':'PUMP01','action':'ON','durationSeconds':60}],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}",
            "{'conditions':{'op':'ALL','items':[" + sensor + "]},'actions':[" + fan + "],'cooldownSeconds':300,'maxRunsPerDay':1,'manualHoldSeconds':0}",           // cooldown < action
            "{'conditions':{'op':'ALL','items':[" + sensor + "]},'actions':[" + fan + "," + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}", // same actuator twice
            "{'conditions':{'op':'ALL','items':[{'op':'ANY','items':[{'op':'ALL','items':[" + sensor + "]}]}]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}", // depth 3
            "{'conditions':{'op':'ALL','items':[" + (sensor + ",").repeat(8) + sensor + "]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}", // 9 leaves
            "{'conditions':{'op':'ALL','items':[" + sensor + "]},'actions':[{'type':'ZONE_SEQUENCE','zones':[{'valveId':'VALVE01','pumpSeconds':60}]}," + fan + "],'cooldownSeconds':9000,'maxRunsPerDay':1,'manualHoldSeconds':0}", // sequence not last
            "{'conditions':{'op':'ALL','items':[{'type':'SENSOR','nodeId':'ENV01','channelId':'NOPE','comparator':'GT','value':1,'forSeconds':0}]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}",
            "{'conditions':{'op':'ALL','items':[{'type':'SENSOR','nodeId':'WATER01','channelId':'LOW','comparator':'GT','value':1,'forSeconds':0}]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}",
            "{'conditions':{'op':'ALL','items':[{'type':'TIME','start':'08:00','end':'08:00','days':[1]}]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}",
            "{'conditions':{'op':'ALL','items':[" + sensor + "]},'actions':[{'type':'ACTUATOR','actuatorId':'MIST01','action':'ON','durationSeconds':601}],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}",
            "{'conditions':{'op':'ALL','items':[" + sensor + "]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':49,'manualHoldSeconds':0}",
            "{'conditions':{'op':'ALL','items':[" + sensor + "]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0,'extra':1}",
            "{'conditions':{'op':'XOR','items':[" + sensor + "]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}",
            "{'conditions':{'op':'ALL','items':[]},'actions':[" + fan + "],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}");
        for (String definition : bad) assertThrows(RuleDefinition.Invalid.class, () -> parse(definition), definition);
    }

    /** In-memory facts: temperature samples every 10 s, and actuator states. */
    static final class Fake implements RuleEvaluator.Facts {
        final Map<String, List<Sample>> data = new HashMap<>();
        final Map<String, String> states = new HashMap<>();
        void series(String key, Instant start, int count, double... values) {
            List<Sample> list = data.computeIfAbsent(key, k -> new ArrayList<>());
            for (int i = 0; i < count; i++) { Instant t = start.plusSeconds(10L * i); list.add(new Sample(t, t, values[Math.min(i, values.length - 1)])); }
        }
        public List<Sample> samples(String node, String channel, Instant from, Instant at) {
            List<Sample> all = data.getOrDefault(node + "/" + channel, List.of()), result = new ArrayList<>();
            Sample before = null;
            for (Sample s : all) { if (s.receivedAt().isBefore(from)) before = s; else if (!s.receivedAt().isAfter(at)) result.add(s); }
            if (before != null) result.addFirst(before);
            return result;
        }
        public String actuatorState(String id, Instant at) { return states.get(id); }
    }

    @Test void sensorMustHoldForTheWholeWindowWithFreshData() {
        var rule = parse(hot(""));
        Instant t0 = Instant.parse("2026-11-21T03:00:00Z");
        Fake facts = new Fake();
        facts.series("ENV01/AIR_TEMP", t0, 9, 33);                                   // 0..80 s, all hot
        assertEquals(Outcome.UNKNOWN, RuleEvaluator.evaluate(rule.conditions(), facts, t0.plusSeconds(50), ZONE), "window not covered yet");
        assertEquals(Outcome.TRUE, RuleEvaluator.evaluate(rule.conditions(), facts, t0.plusSeconds(80), ZONE));
        assertEquals(Outcome.UNKNOWN, RuleEvaluator.evaluate(rule.conditions(), facts, t0.plusSeconds(200), ZONE), "stale: no sample for 120 s");
        Fake dip = new Fake();
        dip.series("ENV01/AIR_TEMP", t0, 9, 33, 33, 33, 31, 33);                        // one cooler sample
        assertEquals(Outcome.FALSE, RuleEvaluator.evaluate(rule.conditions(), dip, t0.plusSeconds(80), ZONE));
        Fake fault = new Fake();
        fault.series("ENV01/AIR_TEMP", t0, 9, 33);
        fault.data.get("ENV01/AIR_TEMP").add(new Sample(t0.plusSeconds(85), t0.plusSeconds(85), null));
        assertEquals(Outcome.UNKNOWN, RuleEvaluator.evaluate(rule.conditions(), fault, t0.plusSeconds(86), ZONE), "sensor fault is unknown");
    }

    @Test void threeValuedGroupsAndTimeWindows() {
        Instant t0 = Instant.parse("2026-11-21T03:00:00Z");                             // Sat 10:00 local
        var anyRule = parse(hot(",{'op':'ANY','items':[{'type':'ACTUATOR_STATE','actuatorId':'PUMP01','state':'ON'},{'type':'TIME','start':'09:00','end':'11:00','days':[6]}]}"));
        Fake facts = new Fake();
        facts.series("ENV01/AIR_TEMP", t0.minusSeconds(80), 9, 35);
        assertEquals(Outcome.TRUE, RuleEvaluator.evaluate(anyRule.conditions(), facts, t0, ZONE), "pump unknown but time window TRUE");
        var allRule = parse(hot(",{'type':'ACTUATOR_STATE','actuatorId':'PUMP01','state':'OFF'}"));
        assertEquals(Outcome.UNKNOWN, RuleEvaluator.evaluate(allRule.conditions(), facts, t0, ZONE), "unknown pump makes ALL unknown");
        facts.states.put("PUMP01", "ON");
        assertEquals(Outcome.FALSE, RuleEvaluator.evaluate(allRule.conditions(), facts, t0, ZONE));
        var night = parse(hot(",{'type':'TIME','start':'22:00','end':'06:00','days':[5]}"));            // Friday night
        Fake n = new Fake();
        Instant satEarly = Instant.parse("2026-11-20T20:00:00Z");                          // Sat 03:00 local, window began Friday
        n.series("ENV01/AIR_TEMP", satEarly.minusSeconds(80), 9, 35);
        assertEquals(Outcome.TRUE, RuleEvaluator.evaluate(night.conditions(), n, satEarly, ZONE));
        assertEquals(Outcome.FALSE, RuleEvaluator.evaluate(night.conditions(), n, satEarly.plusSeconds(5 * 3600), ZONE));
    }
}
