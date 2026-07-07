package com.ticketbox.shared.event;

import java.util.UUID;

public record UserLeftQueueEvent(
        UUID concertId,
        UUID userId
) {}
