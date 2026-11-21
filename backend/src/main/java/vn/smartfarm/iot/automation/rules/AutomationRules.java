package vn.smartfarm.iot.automation.rules;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.automation.IrrigationCalendar;
import vn.smartfarm.iot.automation.IrrigationSequence;
import vn.smartfarm.iot.automation.WateringRule;
import vn.smartfarm.iot.control.ActuatorService;
import vn.smartfarm.iot.realtime.RealtimeNotifier;

/**
 * General automation rules. A rule fires when its condition tree is TRUE (never on UNKNOWN), its
 * cooldown has passed, it is under its daily limit, nobody commanded its actuators by hand in the
 * last manualHoldSeconds, and no zone sequence is running. Actions go through ActuatorService
 * (same command discipline and firmware interlocks as manual commands) or IrrigationSequence.
 * Two enabled rules may never command the same actuator.
 */
@Service
public class AutomationRules {
    private static final Logger LOG = LoggerFactory.getLogger(AutomationRules.class);
    public record SaveRequest(String name, JsonNode definition) {}
    public record Rule(long id, String name, boolean enabled, long revision, JsonNode definition, Set<String> targets, Instant updatedAt,
        Instant lastEvaluatedAt, String lastOutcome, String lastSkip, Instant lastFiredAt, int runsToday) {}
    public record Run(long id, long ruleId, String ruleName, long ruleRevision, Instant firedAt, String result, String detail, List<UUID> commandIds, Long sequenceId) {}
    public record BuiltIn(String name, boolean enabled, Set<String> targets) {}
    public record View(boolean enabled, BuiltIn wateringRule, List<Rule> rules) {}
    public record SimulationRequest(JsonNode definition, Integer hours) {}
    public record Simulation(int hours, Instant from, Instant to, int stepSeconds, int trueMinutes, int falseMinutes, int unknownMinutes, List<Instant> fires, boolean truncated) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final ActuatorService actuators;
    private final IrrigationSequence sequence;
    private final WateringRule watering;
    private final RealtimeNotifier realtime;
    private final ZoneId zone = ZoneId.of(IrrigationCalendar.ZONE);

    public AutomationRules(JdbcTemplate jdbc, ObjectMapper mapper, ActuatorService actuators, IrrigationSequence sequence, WateringRule watering, RealtimeNotifier realtime) {
        this.jdbc = jdbc; this.mapper = mapper; this.actuators = actuators; this.sequence = sequence; this.watering = watering; this.realtime = realtime;
    }

    RuleDefinition.Catalog catalog() {
        return new RuleDefinition.Catalog() {
            public String metric(String node, String channel) {
                return jdbc.query("SELECT metric FROM iot_channel WHERE node_id=? AND channel_id=?", (rs, n) -> rs.getString(1), node, channel).stream().findFirst().orElse(null);
            }
            public Integer actuatorCap(String id) {
                return jdbc.query("SELECT max_seconds FROM iot_actuator_binding WHERE actuator_id=? AND command_contract='ACTUATOR_V3'", (rs, n) -> rs.getInt(1), id).stream().findFirst().orElse(null);
            }
            public String actuatorType(String id) {
                return jdbc.query("SELECT actuator_type FROM iot_actuator_binding WHERE actuator_id=?", (rs, n) -> rs.getString(1), id).stream().findFirst().orElse(null);
            }
            public boolean knownActuator(String id) { return actuatorType(id) != null; }
        };
    }

    RuleDefinition parse(JsonNode definition) {
        try { return RuleDefinition.parse(definition, catalog()); }
        catch (RuleDefinition.Invalid error) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error.getMessage()); }
    }

    private Instant dayStart(Instant now) { return now.atZone(zone).toLocalDate().atStartOfDay(zone).toInstant(); }

    public View view() {
        Instant today = dayStart(Instant.now());
        List<Rule> rules = jdbc.query("SELECT * FROM automation_rule ORDER BY name", (rs, n) -> {
            long id = rs.getLong("id");
            JsonNode definition = read(rs.getString("definition"));
            Set<String> targets;
            try { targets = parse(definition).targets(); } catch (ResponseStatusException error) { targets = Set.of(); }   // e.g. a channel was removed
            return new Rule(id, rs.getString("name"), rs.getBoolean("enabled"), rs.getLong("revision"), definition, targets,
                instant(rs.getTimestamp("updated_at")), instant(rs.getTimestamp("last_evaluated_at")), rs.getString("last_outcome"), rs.getString("last_skip"),
                instant(rs.getTimestamp("last_fired_at")), runsSince(id, today));
        });
        return new View(actuators.enabled(), new BuiltIn("Tưới theo độ ẩm đất (có sẵn)", watering.state().enabled(), Set.of("PUMP01")), rules);
    }

    private int runsSince(long id, Instant from) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM automation_rule_run WHERE rule_id=? AND fired_at>=?", Integer.class, id, Timestamp.from(from));
    }
    private static Instant instant(Timestamp t) { return t == null ? null : t.toInstant(); }
    private JsonNode read(String json) { try { return mapper.readTree(json); } catch (Exception e) { throw new IllegalStateException(e); } }

    private static String name(SaveRequest request) {
        String name = request == null || request.name() == null ? "" : request.name().strip();
        if (name.isEmpty() || name.length() > 80) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name 1..80 characters");
        return name;
    }

    public synchronized Rule create(SaveRequest request) {
        String name = name(request);
        parse(request.definition());
        try {
            long id = jdbc.queryForObject("INSERT INTO automation_rule(name,definition) VALUES(?,?::jsonb) RETURNING id", Long.class, name, request.definition().toString());
            realtime.automationChanged();
            return find(id);
        } catch (org.springframework.dao.DuplicateKeyException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A rule with this name exists");
        }
    }

    public synchronized Rule update(long id, SaveRequest request) {
        String name = name(request);
        RuleDefinition definition = parse(request.definition());
        Rule current = find(id);
        if (current.enabled()) conflicts(id, definition.targets());
        try {
            jdbc.update("UPDATE automation_rule SET name=?,definition=?::jsonb,revision=revision+1,updated_at=CURRENT_TIMESTAMP,last_outcome=NULL,last_skip=NULL WHERE id=?",
                name, request.definition().toString(), id);
        } catch (org.springframework.dao.DuplicateKeyException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A rule with this name exists");
        }
        realtime.automationChanged();
        return find(id);
    }

    public synchronized Rule setEnabled(long id, boolean enabled) {
        Rule rule = find(id);
        if (enabled) {
            if (!actuators.enabled()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Actuator control is disabled");
            conflicts(id, parse(rule.definition()).targets());
        }
        jdbc.update("UPDATE automation_rule SET enabled=?,last_outcome=NULL,last_skip=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?", enabled, id);
        realtime.automationChanged();
        return find(id);
    }

    public synchronized void delete(long id) {
        if (jdbc.update("DELETE FROM automation_rule WHERE id=?", id) == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown rule");
        realtime.automationChanged();
    }

    public Rule find(long id) {
        return view().rules().stream().filter(r -> r.id() == id).findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown rule"));
    }

    /** Refuses when another enabled rule (or the built-in watering rule, for the pump) shares an actuator. */
    void conflicts(long id, Set<String> targets) {
        List<String> clashes = new ArrayList<>();
        for (Rule other : view().rules()) {
            if (other.id() == id || !other.enabled()) continue;
            Set<String> shared = new HashSet<>(targets);
            shared.retainAll(other.targets());
            if (!shared.isEmpty()) clashes.add(other.name() + " " + new java.util.TreeSet<>(shared));
        }
        if (targets.contains("PUMP01") && watering.state().enabled()) clashes.add("Tưới theo độ ẩm đất [PUMP01]");
        if (!clashes.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Conflicts with: " + String.join("; ", clashes));
    }

    public List<Run> runs(Long ruleId) {
        return jdbc.query("""
            SELECT r.*,a.name FROM automation_rule_run r JOIN automation_rule a ON a.id=r.rule_id
            WHERE (?::bigint IS NULL OR r.rule_id=?) ORDER BY r.fired_at DESC,r.id DESC LIMIT 50
            """, (rs, n) -> {
                java.sql.Array array = rs.getArray("command_ids");
                List<UUID> ids = new ArrayList<>();
                for (Object o : (Object[]) array.getArray()) ids.add((UUID) o);
                return new Run(rs.getLong("id"), rs.getLong("rule_id"), rs.getString("name"), rs.getLong("rule_revision"), rs.getTimestamp("fired_at").toInstant(),
                    rs.getString("result"), rs.getString("detail"), ids, rs.getObject("sequence_id", Long.class));
            }, ruleId, ruleId);
    }

    // ---------------- engine ----------------

    public synchronized void tick() {
        if (!actuators.enabled()) return;
        Instant now = Instant.now();
        RuleFacts facts = new RuleFacts(jdbc, true);
        for (Rule rule : view().rules()) {
            if (!rule.enabled()) continue;
            try {
                RuleDefinition definition = parse(rule.definition());
                RuleEvaluator.Outcome outcome = RuleEvaluator.evaluate(definition.conditions(), facts, now, zone);
                String skip = outcome != RuleEvaluator.Outcome.TRUE ? null : skipReason(rule, definition, now);
                jdbc.update("UPDATE automation_rule SET last_evaluated_at=?,last_outcome=?,last_skip=? WHERE id=? AND revision=?",
                    Timestamp.from(now), outcome.name(), skip, rule.id(), rule.revision());
                if (outcome == RuleEvaluator.Outcome.TRUE && skip == null) fire(rule, definition, now);
            } catch (RuntimeException error) {
                LOG.error("Rule {} evaluation failed ({})", rule.id(), error.getClass().getSimpleName());
                jdbc.update("UPDATE automation_rule SET last_evaluated_at=?,last_outcome='UNKNOWN',last_skip='EVALUATION_ERROR' WHERE id=?", Timestamp.from(now), rule.id());
            }
        }
    }

    private String skipReason(Rule rule, RuleDefinition definition, Instant now) {
        if (rule.lastFiredAt() != null && rule.lastFiredAt().plusSeconds(definition.cooldownSeconds()).isAfter(now)) return "COOLDOWN";
        if (runsSince(rule.id(), dayStart(now)) >= definition.maxRunsPerDay()) return "MAX_RUNS_TODAY";
        if (sequence.view().current() != null) return "ZONE_SEQUENCE_RUNNING";
        Set<String> targets = definition.targets();
        targets.remove("PUMP01");
        if (definition.manualHoldSeconds() > 0 && !targets.isEmpty() && jdbc.queryForObject(
            "SELECT COUNT(*) FROM actuator_command WHERE source='MANUAL' AND actuator_id=ANY(?) AND issued_at>?", Integer.class,
            targets.toArray(String[]::new), Timestamp.from(now.minusSeconds(definition.manualHoldSeconds()))) > 0) return "MANUAL_HOLD";
        return null;
    }

    private void fire(Rule rule, RuleDefinition definition, Instant now) {
        List<UUID> commands = new ArrayList<>();
        Long sequenceId = null;
        String result = "FIRED", detail = "OK";
        int done = 0;
        for (RuleDefinition.Action action : definition.actions()) {
            try {
                if (action instanceof RuleDefinition.ActuatorAction a) {
                    commands.add(actuators.create(a.actuatorId(), new ActuatorService.Request(a.action(), a.durationSeconds()), "RULE").commandId());
                } else if (action instanceof RuleDefinition.ZoneSequence z) {
                    var view = sequence.start(new IrrigationSequence.StartRequest(z.zones().stream()
                        .map(zone -> new IrrigationSequence.Zone(zone.valveId(), zone.pumpSeconds())).toList()));
                    sequenceId = view.current() == null ? null : view.current().id();
                }
                done++;
            } catch (ResponseStatusException error) {
                result = done == 0 ? "FAILED" : "PARTIAL";
                detail = "Action " + (done + 1) + " refused: " + error.getStatusCode().value() + " " + error.getReason();
                break;   // later actions are not attempted out of order
            }
        }
        String text = detail.length() > 500 ? detail.substring(0, 500) : detail;
        jdbc.update("INSERT INTO automation_rule_run(rule_id,rule_revision,fired_at,result,detail,command_ids,sequence_id) VALUES(?,?,?,?,?,?,?)",
            rule.id(), rule.revision(), Timestamp.from(now), result, text, commands.toArray(UUID[]::new), sequenceId);
        // Cooldown also follows a refused run, so a failing rule does not retry every tick.
        jdbc.update("UPDATE automation_rule SET last_fired_at=? WHERE id=?", Timestamp.from(now), rule.id());
        realtime.automationChanged();
    }

    // ---------------- simulation ----------------

    public Simulation simulate(SimulationRequest request) {
        RuleDefinition definition = parse(request == null ? null : request.definition());
        int hours = request.hours() == null ? 24 : request.hours();
        if (hours < 1 || hours > 72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "hours 1..72");
        Instant to = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES), from = to.minus(Duration.ofHours(hours));
        RuleEvaluator.Facts facts = new MemoryFacts(jdbc, from, to);
        int step = 60, t = 0, f = 0, u = 0;
        List<Instant> fires = new ArrayList<>();
        Map<LocalDate, Integer> perDay = new HashMap<>();
        Instant last = null;
        boolean truncated = false;
        for (Instant at = from; !at.isAfter(to); at = at.plusSeconds(step)) {
            var outcome = RuleEvaluator.evaluate(definition.conditions(), facts, at, zone);
            switch (outcome) { case TRUE -> t++; case FALSE -> f++; default -> u++; }
            if (outcome != RuleEvaluator.Outcome.TRUE) continue;
            if (last != null && last.plusSeconds(definition.cooldownSeconds()).isAfter(at)) continue;
            LocalDate day = at.atZone(zone).toLocalDate();
            if (perDay.getOrDefault(day, 0) >= definition.maxRunsPerDay()) continue;
            perDay.merge(day, 1, Integer::sum);
            last = at;
            if (fires.size() < 200) fires.add(at); else truncated = true;
        }
        return new Simulation(hours, from, to, step, t, f, u, fires, truncated);
    }
}
