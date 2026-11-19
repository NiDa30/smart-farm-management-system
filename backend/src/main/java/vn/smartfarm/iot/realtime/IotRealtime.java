package vn.smartfarm.iot.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * Server-to-browser invalidation hub for /ws/iot. A message says "these topics changed at
 * version N"; it never carries measurements, commands or alert contents.
 */
@Component
public class IotRealtime extends TextWebSocketHandler implements RealtimeNotifier, DisposableBean {
    private static final Logger LOG = LoggerFactory.getLogger(IotRealtime.class);
    static final int MAX_SESSIONS = 64;
    private final ObjectMapper mapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final AtomicLong version = new AtomicLong();
    // One sender thread keeps per-session message order and keeps slow sockets off ingestion threads.
    private final ExecutorService sender = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "iot-realtime");
        thread.setDaemon(true);
        return thread;
    });

    public IotRealtime(ObjectMapper mapper) { this.mapper = mapper; }

    @Override
    public void publish(String... topics) {
        if (topics.length == 0) throw new IllegalArgumentException("At least one realtime topic required");
        for (String topic : topics) if (!TOPICS.contains(topic)) throw new IllegalArgumentException("Unknown realtime topic " + topic);
        Set<String> changed = new TreeSet<>(Arrays.asList(topics));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            // A rolled-back write must not make browsers refetch state that never existed.
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { dispatch(changed); }
            });
        } else {
            dispatch(changed);
        }
    }

    public long version() { return version.get(); }
    public int sessionCount() { return sessions.size(); }

    private void dispatch(Set<String> topics) {
        long current = version.incrementAndGet();
        if (sessions.isEmpty()) return;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "changed");
        body.put("version", current);
        body.put("topics", topics);
        body.put("at", Instant.now().toString());
        enqueue(body);
    }

    private void enqueue(Map<String, Object> body) {
        final String text;
        try { text = mapper.writeValueAsString(body); }
        catch (JsonProcessingException error) { LOG.error("Realtime message not serialized"); return; }
        try { sender.execute(() -> sessions.values().forEach(session -> send(session, text))); }
        catch (RejectedExecutionException error) { LOG.debug("Realtime sender stopped; notification dropped"); }
    }

    private void send(WebSocketSession session, String text) {
        try {
            if (session.isOpen()) session.sendMessage(new TextMessage(text));
            else sessions.remove(session.getId());
        } catch (Exception error) {
            // A failed or overflowing socket is dropped; the browser reconnects and refetches.
            sessions.remove(session.getId());
            try { session.close(CloseStatus.SESSION_NOT_RELIABLE); } catch (Exception ignored) { }
        }
    }

    /** Lets browsers tell a quiet farm from a dead socket. */
    @Scheduled(fixedRate = 25000, initialDelay = 25000)
    public void heartbeat() {
        if (sessions.isEmpty()) return;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "heartbeat");
        body.put("version", version.get());
        enqueue(body);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession raw) throws Exception {
        if (sessions.size() >= MAX_SESSIONS) { raw.close(CloseStatus.SERVICE_OVERLOAD); return; }
        WebSocketSession session = new ConcurrentWebSocketSessionDecorator(raw, 5000, 64 * 1024);
        sessions.put(raw.getId(), session);
        Map<String, Object> hello = new LinkedHashMap<>();
        hello.put("type", "hello");
        hello.put("version", version.get());
        String text = mapper.writeValueAsString(hello);
        try { sender.execute(() -> send(session, text)); }
        catch (RejectedExecutionException error) { sessions.remove(raw.getId()); raw.close(CloseStatus.GOING_AWAY); }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        sessions.remove(session.getId());
        session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Server-to-client only"));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) { sessions.remove(session.getId()); }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable error) { sessions.remove(session.getId()); }

    @Override
    public void destroy() {
        sender.shutdownNow();
        for (WebSocketSession session : sessions.values()) {
            try { session.close(CloseStatus.GOING_AWAY); } catch (Exception ignored) { }
        }
        sessions.clear();
    }
}
