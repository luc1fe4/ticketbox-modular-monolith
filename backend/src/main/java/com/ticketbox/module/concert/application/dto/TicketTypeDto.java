package com.ticketbox.module.concert.application.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TicketTypeDto(
        UUID id,
        UUID concertId,
        String name,
        BigDecimal price,
        int totalQuantity,
        int availableQty,
        int maxPerAccount,
        OffsetDateTime saleStartAt,
        OffsetDateTime saleEndAt,
        String zoneColor,
        boolean isActive,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
