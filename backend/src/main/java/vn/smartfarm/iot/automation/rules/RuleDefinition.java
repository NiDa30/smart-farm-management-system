package vn.smartfarm.iot.automation.rules;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Validated rule definition. Parsing is strict: unknown fields, wrong types, out-of-range
 * values or unsafe shapes are rejected with a message, never repaired.
 *
 * Limits: condition tree depth ≤ 2 (root group + one nested group), 1–8 leaf conditions,
 * 1–4 actions, at most one ZONE_SEQUENCE action and only as the last action, no actuator twice,
 * cooldown ≥ the longest action (no overlapping runs), 1–48 runs per day.
 */
public record RuleDefinition(Group conditions, List<Action> actions, int cooldownSeconds, int maxRunsPerDay, int manualHoldSeconds) {

    public sealed interface Node permits Group, Sensor, TimeWindow, ActuatorState {}
    public record Group(String op, List<Node> items) implements Node {}
    public record Sensor(String nodeId, String channelId, String comparator, double value, int forSeconds) implements Node {}
    public record TimeWindow(LocalTime start, LocalTime end, Set<Integer> days) implements Node {}
    public record ActuatorState(String actuatorId, String state) implements Node {}

    public sealed interface Action permits ActuatorAction, ZoneSequence {}
    public record ActuatorAction(String actuatorId, String action, Integer durationSeconds) implements Action {}
    public record Zone(String valveId, int pumpSeconds) {}
    public record ZoneSequence(List<Zone> zones) implements Action {}

    /** What the validator needs to know about the farm (registry lookups). */
    public interface Catalog {
        /** metric of a registered channel, or null. */
        String metric(String nodeId, String channelId);
        /** max ON seconds of a v3 actuator, or null if not a v3 actuator. */
        Integer actuatorCap(String actuatorId);
        String actuatorType(String actuatorId);
        boolean knownActuator(String actuatorId);
    }

    public static final class Invalid extends RuntimeException {
        public Invalid(String message) { super(message); }
    }

    private static final String ID = "[A-Z][A-Z0-9_]{1,15}";
    static final Set<String> NUMERIC = Set.of("AIR_TEMPERATURE", "AIR_HUMIDITY", "SOIL_MOISTURE", "FLOW_RATE", "WATER_TEMPERATURE", "WATER_PRESSURE");

    public static RuleDefinition parse(JsonNode json, Catalog catalog) {
        if (json == null || !json.isObject()) throw new Invalid("Definition must be an object");
        fields(json, Set.of("conditions", "actions", "cooldownSeconds", "maxRunsPerDay", "manualHoldSeconds"), "definition");
        int[] leaves = {0};
        JsonNode root = json.path("conditions");
        if (!root.isObject() || root.has("type")) throw new Invalid("conditions must be a group {op, items}");
        Group conditions = (Group) node(root, 1, leaves, catalog);
        if (leaves[0] < 1 || leaves[0] > 8) throw new Invalid("1..8 conditions");
        JsonNode list = json.path("actions");
        if (!list.isArray() || list.isEmpty() || list.size() > 4) throw new Invalid("1..4 actions");
        List<Action> actions = new ArrayList<>();
        Set<String> targets = new HashSet<>();
        int longest = 0;
        for (int i = 0; i < list.size(); i++) {
            JsonNode a = list.get(i);
            String type = text(a, "type");
            if (type.equals("ACTUATOR")) {
                fields(a, Set.of("type", "actuatorId", "action", "durationSeconds"), "action");
                String id = text(a, "actuatorId"), action = text(a, "action");
                Integer cap = catalog.actuatorCap(id);
                if (cap == null) throw new Invalid("Only zone valves, fan, light and misting can be rule actions (PUMP01 only through ZONE_SEQUENCE): " + id);
                if (!targets.add(id)) throw new Invalid("Actuator used twice: " + id);
                if (action.equals("ON")) {
                    int seconds = integer(a, "durationSeconds", 1, cap);
                    longest = Math.max(longest, seconds);
                    actions.add(new ActuatorAction(id, "ON", seconds));
                } else if (action.equals("OFF")) {
                    if (a.has("durationSeconds")) throw new Invalid("OFF has no duration");
                    actions.add(new ActuatorAction(id, "OFF", null));
                } else throw new Invalid("action ON or OFF");
            } else if (type.equals("ZONE_SEQUENCE")) {
                fields(a, Set.of("type", "zones"), "action");
                if (i != list.size() - 1) throw new Invalid("ZONE_SEQUENCE must be the last action");
                JsonNode zones = a.path("zones");
                if (!zones.isArray() || zones.isEmpty() || zones.size() > 4) throw new Invalid("1..4 zones");
                List<Zone> parsed = new ArrayList<>();
                int total = 0;
                for (JsonNode z : zones) {
                    fields(z, Set.of("valveId", "pumpSeconds"), "zone");
                    String valve = text(z, "valveId");
                    if (!"VALVE".equals(catalog.actuatorType(valve))) throw new Invalid("Not a zone valve: " + valve);
                    if (!targets.add(valve)) throw new Invalid("Actuator used twice: " + valve);
                    int seconds = integer(z, "pumpSeconds", 1, 1800);
                    total += seconds + 60;
                    parsed.add(new Zone(valve, seconds));
                }
                targets.add("PUMP01");
                longest = Math.max(longest, total);
                actions.add(new ZoneSequence(parsed));
            } else throw new Invalid("action type ACTUATOR or ZONE_SEQUENCE");
        }
        int cooldown = integer(json, "cooldownSeconds", 60, 86400);
        if (cooldown < longest) throw new Invalid("cooldownSeconds must be at least the longest action (" + longest + " s) so runs never overlap");
        return new RuleDefinition(conditions, List.copyOf(actions), cooldown, integer(json, "maxRunsPerDay", 1, 48), integer(json, "manualHoldSeconds", 0, 7200));
    }

    private static Node node(JsonNode n, int depth, int[] leaves, Catalog catalog) {
        if (!n.isObject()) throw new Invalid("Condition must be an object");
        if (n.has("op")) {
            if (depth > 2) throw new Invalid("Groups can be nested only one level");
            fields(n, Set.of("op", "items"), "group");
            String op = text(n, "op");
            if (!op.equals("ALL") && !op.equals("ANY")) throw new Invalid("op ALL or ANY");
            JsonNode items = n.path("items");
            if (!items.isArray() || items.isEmpty()) throw new Invalid("A group needs at least one item");
            List<Node> parsed = new ArrayList<>();
            for (JsonNode item : items) parsed.add(node(item, depth + 1, leaves, catalog));
            return new Group(op, List.copyOf(parsed));
        }
        leaves[0]++;
        String type = text(n, "type");
        switch (type) {
            case "SENSOR" -> {
                fields(n, Set.of("type", "nodeId", "channelId", "comparator", "value", "forSeconds"), "SENSOR");
                String node = text(n, "nodeId"), channel = text(n, "channelId"), comparator = text(n, "comparator");
                String metric = catalog.metric(node, channel);
                if (metric == null) throw new Invalid("Unknown sensor channel " + node + "/" + channel);
                int forSeconds = integer(n, "forSeconds", 0, 3600);
                if (metric.equals("WATER_PRESENT")) {
                    if (!comparator.equals("EQ") || !n.path("value").isBoolean()) throw new Invalid("Float switch: comparator EQ with true/false");
                    return new Sensor(node, channel, "EQ", n.path("value").asBoolean() ? 1 : 0, forSeconds);
                }
                if (!NUMERIC.contains(metric) || !Set.of("GT", "GTE", "LT", "LTE").contains(comparator)) throw new Invalid("comparator GT, GTE, LT or LTE");
                JsonNode value = n.path("value");
                if (!value.isNumber() || !Double.isFinite(value.asDouble()) || Math.abs(value.asDouble()) > 100000) throw new Invalid("value must be a number");
                return new Sensor(node, channel, comparator, value.asDouble(), forSeconds);
            }
            case "TIME" -> {
                fields(n, Set.of("type", "start", "end", "days"), "TIME");
                LocalTime start = time(text(n, "start")), end = time(text(n, "end"));
                if (start.equals(end)) throw new Invalid("start and end must differ");
                JsonNode days = n.path("days");
                if (!days.isArray() || days.isEmpty() || days.size() > 7) throw new Invalid("days: 1..7 values (1=Monday)");
                Set<Integer> set = new HashSet<>();
                for (JsonNode d : days) if (!d.isInt() || d.asInt() < 1 || d.asInt() > 7 || !set.add(d.asInt())) throw new Invalid("days: distinct 1..7");
                return new TimeWindow(start, end, Set.copyOf(set));
            }
            case "ACTUATOR_STATE" -> {
                fields(n, Set.of("type", "actuatorId", "state"), "ACTUATOR_STATE");
                String id = text(n, "actuatorId"), state = text(n, "state");
                if (!catalog.knownActuator(id)) throw new Invalid("Unknown actuator " + id);
                if (!state.equals("ON") && !state.equals("OFF")) throw new Invalid("state ON or OFF");
                return new ActuatorState(id, state);
            }
            default -> throw new Invalid("condition type SENSOR, TIME or ACTUATOR_STATE");
        }
    }

    /** Actuators a rule may command (PUMP01 included for a zone sequence) — used for conflicts. */
    public Set<String> targets() {
        Set<String> result = new HashSet<>();
        for (Action action : actions) {
            if (action instanceof ActuatorAction a) result.add(a.actuatorId());
            if (action instanceof ZoneSequence z) { result.add("PUMP01"); z.zones().forEach(zone -> result.add(zone.valveId())); }
        }
        return result;
    }

    private static void fields(JsonNode n, Set<String> allowed, String where) {
        if (!n.isObject()) throw new Invalid(where + " must be an object");
        n.fieldNames().forEachRemaining(name -> { if (!allowed.contains(name)) throw new Invalid("Unknown field in " + where + ": " + name); });
    }
    private static String text(JsonNode n, String field) {
        JsonNode v = n.path(field);
        if (!v.isTextual() || v.asText().isBlank()) throw new Invalid(field + " is required");
        if ((field.endsWith("Id")) && !v.asText().matches(ID)) throw new Invalid(field + " has an invalid format");
        return v.asText();
    }
    private static int integer(JsonNode n, String field, int min, int max) {
        JsonNode v = n.path(field);
        if (!v.isInt() || v.asInt() < min || v.asInt() > max) throw new Invalid(field + " must be an integer " + min + ".." + max);
        return v.asInt();
    }
    private static LocalTime time(String value) {
        if (!value.matches("([01]\\d|2[0-3]):[0-5]\\d")) throw new Invalid("time HH:MM");
        return LocalTime.parse(value);
    }
}
