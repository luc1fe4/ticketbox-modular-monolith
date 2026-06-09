package com.ticketbox.module.concert.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TicketTypeAvailabilityDto(
        UUID concertId,
        List<AvailabilityItem> items,
        OffsetDateTime refreshedAt
) {
    public record AvailabilityItem(
            UUID ticketTypeId,
            String name,
            int availableQty,
            int totalQuantity
    ) {}
}
