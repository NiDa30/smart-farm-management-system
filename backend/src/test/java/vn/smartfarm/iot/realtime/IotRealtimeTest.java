package vn.smartfarm.iot.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IotRealtimeTest {
    IotRealtime hub;
    @BeforeEach void setup() { hub = new IotRealtime(new ObjectMapper()); }
    @AfterEach void teardown() {
        hub.destroy();
        if (TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.clearSynchronization();
    }
    WebSocketSession session(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }

    @Test void rejectsUnknownOrEmptyTopics() {
        assertThrows(IllegalArgumentException.class, () -> hub.publish("pumps"));
        assertThrows(IllegalArgumentException.class, () -> hub.publish());
        assertEquals(0, hub.version());
    }

    @Test void greetsThenSendsSortedTopicsWithIncreasingVersion() throws Exception {
        WebSocketSession session = session("a");
        hub.afterConnectionEstablished(session);
        hub.publish("telemetry", "alerts", "telemetry");
        hub.pumpChanged();
        ArgumentCaptor<TextMessage> sent = ArgumentCaptor.forClass(TextMessage.class);
        verify(session, timeout(2000).times(3)).sendMessage(sent.capture());
        var messages = sent.getAllValues();
        assertTrue(messages.get(0).getPayload().contains("\"type\":\"hello\""));
        assertTrue(messages.get(1).getPayload().contains("\"version\":1"));
        assertTrue(messages.get(1).getPayload().contains("\"topics\":[\"alerts\",\"telemetry\"]"));
        assertTrue(messages.get(2).getPayload().contains("\"version\":2"));
        assertEquals(1, hub.sessionCount());
    }

    @Test void waitsForCommitAndDropsRolledBackChanges() {
        TransactionSynchronizationManager.initSynchronization();
        hub.alertsChanged();
        assertEquals(0, hub.version(), "nothing is announced before commit");
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        assertEquals(1, hub.version());
        TransactionSynchronizationManager.clearSynchronization();
        TransactionSynchronizationManager.initSynchronization();
        hub.alertsChanged();
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        assertEquals(1, hub.version(), "a rollback announces nothing");
    }

    @Test void clientMessagesCloseTheSocket() throws Exception {
        WebSocketSession session = session("b");
        hub.afterConnectionEstablished(session);
        hub.handleTextMessage(session, new TextMessage("hi"));
        verify(session).close(argThat(status -> status.getCode() == CloseStatus.NOT_ACCEPTABLE.getCode()));
        assertEquals(0, hub.sessionCount());
    }

    @Test void failingSocketIsDroppedWithoutAffectingOthers() throws Exception {
        WebSocketSession broken = session("c"), healthy = session("d");
        doThrow(new java.io.IOException("gone")).when(broken).sendMessage(any());
        hub.afterConnectionEstablished(broken);
        hub.afterConnectionEstablished(healthy);
        hub.commandChanged();
        verify(healthy, timeout(2000).times(2)).sendMessage(any());
        verify(broken, timeout(2000)).close(any());
        assertEquals(1, hub.sessionCount());
    }

    @Test void refusesSessionsBeyondTheLimit() throws Exception {
        for (int i = 0; i < IotRealtime.MAX_SESSIONS; i++) hub.afterConnectionEstablished(session("s" + i));
        WebSocketSession extra = session("overflow");
        hub.afterConnectionEstablished(extra);
        verify(extra).close(CloseStatus.SERVICE_OVERLOAD);
        assertEquals(IotRealtime.MAX_SESSIONS, hub.sessionCount());
    }
}
