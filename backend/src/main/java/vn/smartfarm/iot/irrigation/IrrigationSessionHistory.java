package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Read stored workflow and command evidence. Never calls readiness/dispatch or repairs state. */
@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class IrrigationSessionHistory {
    public record Entry(long id, IrrigationSession.Run session, long actionCount, long unresolvedCount) {}
    public record Page(Instant from, Instant to, String circuitId, String condition, Instant asOf,
                       long ceilingId, List<Entry> items, String nextCursor) {}
    public record Command(String kind, UUID commandId, String action, String state, String reportedState,
                          String errorCode, Instant issuedAt, Instant expiresAt, UUID targetBootId,
                          long ordinal, Instant acknowledgedAt, UUID ackBootId, Long ackSequence) {}
    public record Step(long id, Instant createdAt, IrrigationSession.Operation operation, Command command) {}
    public record Steps(IrrigationSession.Run session, Instant asOf, long ceilingId, List<Step> items,
                        String nextCursor) {}
    private record Cursor(long ceiling, Instant at, long id, String scope) {}
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final IrrigationSession sessions;

    public IrrigationSessionHistory(JdbcTemplate jdbc, ObjectMapper mapper, IrrigationSession sessions) {
        this.jdbc = jdbc; this.mapper = mapper; this.sessions = sessions;
    }

    public Page list(Instant from, Instant to, String circuit, String condition, int limit, String token) {
        if (from == null || to == null || !from.isBefore(to) || Duration.between(from, to).compareTo(Duration.ofDays(31)) > 0)
            throw bad("Choose a time range up to 31 days");
        validateCircuit(circuit); validateLimit(limit);
        String filter = condition == null ? "ALL" : condition;
        if (!Set.of("ALL", "UNFINISHED", "CLOSED", "RECOVERY").contains(filter)) throw bad("Invalid session condition");
        String scope = scope("sessions|" + from + "|" + to + "|" + circuit + "|" + filter);
        Cursor c = cursor(token, scope);
        if (c != null && (c.at().isBefore(from) || !c.at().isBefore(to))) throw bad("Cursor outside time range");
        long ceiling = c == null ? maximum("irrigation_session", null) : c.ceiling();
        String sql = "SELECT s.history_id,s.session_id,s.circuit_id,s.created_at,"
            + "(SELECT count(*) FROM irrigation_session_action a WHERE a.session_id=s.session_id) AS actions,"
            + "(SELECT count(*) FROM irrigation_session_action a WHERE a.session_id=s.session_id AND a.state<>'RETURNED') AS unresolved "
            + "FROM irrigation_session s WHERE s.created_at>=? AND s.created_at<? AND s.history_id<=?";
        var args = new ArrayList<Object>(List.of(Timestamp.from(from), Timestamp.from(to), ceiling));
        if (circuit != null) { sql += " AND s.circuit_id=?"; args.add(circuit); }
        sql += switch (filter) {
            case "UNFINISHED" -> " AND s.phase<>'CLOSED_CONFIRMED'";
            case "CLOSED" -> " AND s.phase='CLOSED_CONFIRMED'";
            case "RECOVERY" -> " AND s.phase='RECOVERY_REQUIRED'";
            default -> "";
        };
        if (c != null) { sql += " AND (s.created_at,s.history_id)<(?,?)"; args.add(Timestamp.from(c.at())); args.add(c.id()); }
        sql += " ORDER BY s.created_at DESC,s.history_id DESC LIMIT ?"; args.add(limit + 1);
        var rows = jdbc.query(sql, (r, n) -> new Entry(r.getLong("history_id"),
            sessions.find(r.getString("circuit_id"), r.getObject("session_id", UUID.class)),
            r.getLong("actions"), r.getLong("unresolved")), args.toArray());
        var visible = List.copyOf(rows.subList(0, Math.min(limit, rows.size())));
        String next = rows.size() > limit ? encode(new Cursor(ceiling, visible.getLast().session().createdAt(), visible.getLast().id(), scope)) : null;
        return new Page(from, to, circuit, filter, Instant.now(), ceiling, visible, next);
    }

    public Steps steps(String circuit, UUID session, int limit, String token) {
        validateCircuit(circuit); validateLimit(limit);
        if (circuit == null || session == null) throw bad("Session and circuit required");
        var run = sessions.find(circuit, session); // Historical snapshot, independent of today's registry.
        String scope = scope("steps|" + circuit + "|" + session);
        Cursor c = cursor(token, scope);
        long ceiling = c == null ? maximum("irrigation_session_action", session) : c.ceiling();
        String sql = "SELECT history_id,request_id,created_at FROM irrigation_session_action WHERE session_id=? AND history_id<=?";
        var args = new ArrayList<Object>(List.of(session, ceiling));
        if (c != null) { sql += " AND (created_at,history_id)<(?,?)"; args.add(Timestamp.from(c.at())); args.add(c.id()); }
        sql += " ORDER BY created_at DESC,history_id DESC LIMIT ?"; args.add(limit + 1);
        var rows = jdbc.query(sql, (r, n) -> {
            var op = sessions.operation(circuit, r.getObject("request_id", UUID.class));
            return new Step(r.getLong("history_id"), r.getTimestamp("created_at").toInstant(), op, command(op, run));
        }, args.toArray());
        var visible = List.copyOf(rows.subList(0, Math.min(limit, rows.size())));
        String next = rows.size() > limit ? encode(new Cursor(ceiling, visible.getLast().createdAt(), visible.getLast().id(), scope)) : null;
        return new Steps(run, Instant.now(), ceiling, visible, next);
    }

    Command command(IrrigationSession.Operation op, IrrigationSession.Run run) {
        if (op.action().equals("FINISH")) return null;
        if (Set.of("ON", "OFF").contains(op.action())) {
            var rows = jdbc.query("SELECT * FROM pump_command WHERE command_id=? AND http_intent_revision IS NOT NULL", (r, n) -> {
                var original = new vn.smartfarm.iot.control.PumpCommandFencing.HttpIntent(op.requestId(), r.getString("action"),
                    r.getObject("duration_seconds", Integer.class), r.getObject("http_expected_boot", UUID.class),
                    r.getLong("http_intent_revision"), r.getTimestamp("http_reviewed_at").toInstant(),
                    read(r.getString("circuit_route"), vn.smartfarm.iot.control.PumpCircuitRoute.class));
                // A reused UUID rejected by dispatch must not attach someone else's command.
                if (!original.equals(read(op.payload().toString(), vn.smartfarm.iot.control.PumpCommandFencing.HttpIntent.class))) return null;
                return new Command("PUMP", op.requestId(), r.getString("action"), r.getString("state"),
                    r.getString("reported_state"), r.getString("error_code"), instant(r, "issued_at"), instant(r, "expires_at"),
                    r.getObject("target_boot_id", UUID.class), r.getLong("fence_ordinal"), instant(r, "acknowledged_at"),
                    r.getObject("ack_boot_id", UUID.class), r.getObject("ack_sequence", Long.class));
            }, op.requestId());
            return rows.isEmpty() ? null : rows.getFirst();
        }
        var rows = jdbc.query("SELECT * FROM circuit_demo_command WHERE command_id=?", (r, n) -> {
            var p = read(op.payload().toString(), CircuitValveControl.Request.class);
            var config = read(r.getString("config_snapshot"), IrrigationCircuits.Config.class);
            if (!config.equals(run.config()) || !Objects.equals(p.expectedBootId(), r.getObject("boot_id", UUID.class))
                || !p.action().equals(r.getString("action")) || !Objects.equals(p.durationSeconds(), r.getObject("duration_seconds", Integer.class))
                || !p.requestedAt().equals(instant(r, "requested_at"))) return null;
            Long seq = r.getObject("ack_sequence", Long.class);
            return new Command("VALVE", op.requestId(), r.getString("action"), r.getString("state"), null,
                r.getString("error_code"), instant(r, "issued_at"), instant(r, "expires_at"), r.getObject("boot_id", UUID.class),
                r.getLong("ordinal"), null, seq == null ? null : r.getObject("boot_id", UUID.class), seq);
        }, op.requestId());
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private long maximum(String table, UUID session) {
        return session == null ? jdbc.queryForObject("SELECT COALESCE(MAX(history_id),0) FROM " + table, Long.class)
            : jdbc.queryForObject("SELECT COALESCE(MAX(history_id),0) FROM " + table + " WHERE session_id=?", Long.class, session);
    }
    private <T> T read(String text, Class<T> type) {
        if (text == null) return null;
        try { return mapper.readValue(text, type); } catch (Exception e) { throw new IllegalStateException("Invalid stored session evidence", e); }
    }
    private static Instant instant(ResultSet r, String column) throws SQLException { var t = r.getTimestamp(column); return t == null ? null : t.toInstant(); }
    private static void validateLimit(int limit) { if (limit < 1 || limit > 100) throw bad("Limit must be 1..100"); }
    private static void validateCircuit(String id) { if (id != null && !id.matches("[A-Z][A-Z0-9_-]{1,31}")) throw bad("Invalid circuit ID"); }
    private static String scope(String text) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    private static String encode(Cursor c) { return Base64.getUrlEncoder().withoutPadding().encodeToString((c.ceiling()+"\n"+c.at()+"\n"+c.id()+"\n"+c.scope()).getBytes(StandardCharsets.UTF_8)); }
    private static Cursor cursor(String token, String scope) {
        if (token == null) return null;
        try {
            if (token.length() > 512) throw new IllegalArgumentException();
            String[] p = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8).split("\n", -1);
            if (p.length != 4 || !p[0].matches("[1-9][0-9]{0,15}") || !p[2].matches("[1-9][0-9]{0,15}") || !p[3].equals(scope)) throw new IllegalArgumentException();
            long ceiling = Long.parseLong(p[0]), id = Long.parseLong(p[2]);
            if (ceiling > 9007199254740991L || id > ceiling) throw new IllegalArgumentException();
            return new Cursor(ceiling, Instant.parse(p[1]), id, scope);
        } catch (RuntimeException e) { throw bad("Invalid or mismatched session history cursor"); }
    }
    private static ResponseStatusException bad(String text) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, text); }
}
