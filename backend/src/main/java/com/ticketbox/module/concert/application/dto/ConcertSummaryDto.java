package com.ticketbox.module.concert.application.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Lightweight concert info for the list/browse page.
 *
 * A Java "record" is a special class that:
 * - Has only final (immutable) fields
 * - Auto-generates constructor, getters, equals(), hashCode(), toString()
 * - Perfect for DTOs (Data Transfer Objects)
 *
 * This DTO intentionally EXCLUDES heavy fields like artistBio and seatMapSvg
 * to keep the list response lightweight.
 */
public record ConcertSummaryDto(
        UUID id,
        String title,
        String venueName,
        OffsetDateTime eventDate,
        String status,
        String posterUrl
) {}
