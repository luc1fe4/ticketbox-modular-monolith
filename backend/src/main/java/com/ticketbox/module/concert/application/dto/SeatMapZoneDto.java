package com.ticketbox.module.concert.application.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SeatMapZoneDto(
        UUID ticketTypeId,
        String name,
        String zoneColor,
        BigDecimal price,
        int totalQuantity,
        int availableQuantity
) {}
