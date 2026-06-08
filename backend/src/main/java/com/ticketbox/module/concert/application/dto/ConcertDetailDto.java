package com.ticketbox.module.concert.application.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Full concert detail including artist_bio for the detail page.
 *
 * This DTO includes ALL public-facing fields of a concert,
 * including the artistBio that the AI module generates from PDF press kits.
 */
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
        OffsetDateTime createdAt
) {}
