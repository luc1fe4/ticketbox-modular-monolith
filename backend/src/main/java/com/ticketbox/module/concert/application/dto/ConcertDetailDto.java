package com.ticketbox.module.concert.application.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ConcertDetailDto(
        UUID id,
        String title,
        String description,
        String artistBio,
        String venueName,
        String venueAddress,
        OffsetDateTime eventDate,
        OffsetDateTime doorsOpenAt,
        String status,
        String seatMapSvg,
        String posterUrl,
        UUID createdBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
