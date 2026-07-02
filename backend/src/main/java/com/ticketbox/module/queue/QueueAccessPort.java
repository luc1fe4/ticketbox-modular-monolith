package com.ticketbox.module.queue;

import java.util.UUID;

public interface QueueAccessPort {
    void validateAccess(UUID concertId, UUID userId, String queueAccessToken);
}
