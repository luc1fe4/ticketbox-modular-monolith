package com.ticketbox.module.concert.application.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ConcertSummaryDto(
        UUID id,
        String title,
        String venueName,
        OffsetDateTime eventDate,
        String status,
        String posterUrl
) {}
