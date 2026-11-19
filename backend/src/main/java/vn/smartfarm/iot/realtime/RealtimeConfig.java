package vn.smartfarm.iot.realtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@EnableScheduling
public class RealtimeConfig implements WebSocketConfigurer {
    private final IotRealtime handler;
    private final String[] origins;

    // Explicit origins: the socket is unauthenticated like the rest of the local MVP API, so
    // it must not be readable from arbitrary pages open in the same browser.
    public RealtimeConfig(IotRealtime handler,
        @Value("${smartfarm.realtime.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}") String[] origins) {
        for (String origin : origins) {
            if (origin.equals("*") || !origin.matches("https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?")) {
                throw new IllegalArgumentException("smartfarm.realtime.allowed-origins must list explicit http(s) origins");
            }
        }
        this.handler = handler;
        this.origins = origins.clone();
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/iot").setAllowedOrigins(origins);
    }
}
