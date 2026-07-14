package com.ticketbox.module.queue.application;

import com.ticketbox.module.queue.web.dto.QueueStatusResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Pushes private queue state over STOMP; no browser polling is used once connected. */
@Service
@RequiredArgsConstructor
@Slf4j
public class QueueRealtimeService {

    private final WaitingRoomService waitingRoomService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Subscription> subscriptions = new ConcurrentHashMap<>();

    public void subscribe(String sessionId, UUID userId, UUID concertId) {
        subscriptions.put(sessionId, new Subscription(userId, concertId));
        push(sessionId, userId, concertId);
    }

    @Scheduled(fixedDelayString = "${ticketbox.queue.websocket-push-interval-ms:1000}")
    public void publishUpdates() {
        subscriptions.forEach((sessionId, subscription) -> push(sessionId, subscription.userId(), subscription.concertId()));
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        Subscription disconnected = subscriptions.remove(event.getSessionId());
        if (disconnected == null || subscriptions.values().stream().anyMatch(subscription ->
                subscription.userId().equals(disconnected.userId()) && subscription.concertId().equals(disconnected.concertId()))) {
            return;
        }

        try {
            if (waitingRoomService.isStillWaiting(disconnected.concertId(), disconnected.userId())) {
                waitingRoomService.leave(disconnected.concertId(), disconnected.userId());
            }
        } catch (RuntimeException exception) {
            log.debug("Could not release disconnected waiting-room session", exception);
        }
    }

    private void push(String sessionId, UUID userId, UUID concertId) {
        try {
            QueueStatusResponse status = waitingRoomService.status(concertId, userId);
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/concerts/" + concertId,
                    status,
                    Map.of("simpSessionId", sessionId)
            );
        } catch (RuntimeException exception) {
            log.debug("Could not push waiting-room update for session {}", sessionId, exception);
        }
    }

    private record Subscription(UUID userId, UUID concertId) {
    }
}
