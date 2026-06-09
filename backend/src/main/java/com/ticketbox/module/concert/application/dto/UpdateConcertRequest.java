package com.ticketbox.module.concert.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record UpdateConcertRequest(
        @NotBlank(message = "Title must not be blank")
        String title,

        String description,

        @NotBlank(message = "Venue name must not be blank")
        String venueName,

        @NotBlank(message = "Venue address must not be blank")
        String venueAddress,

        @NotNull(message = "Event date must not be null")
        OffsetDateTime eventDate,

        OffsetDateTime doorsOpenAt,

        String seatMapSvg,

        String posterUrl
) {}
