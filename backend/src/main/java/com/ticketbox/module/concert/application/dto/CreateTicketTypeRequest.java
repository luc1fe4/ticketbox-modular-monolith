package com.ticketbox.module.concert.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreateTicketTypeRequest(
        @NotBlank(message = "Name must not be blank")
        String name,

        @NotNull(message = "Price must not be null")
        @DecimalMin(value = "0.0", message = "Price must be non-negative")
        BigDecimal price,

        @Min(value = 1, message = "Total quantity must be at least 1")
        int totalQuantity,

        @Min(value = 1, message = "Max per account must be at least 1")
        int maxPerAccount,

        @NotNull(message = "Sale start date must not be null")
        OffsetDateTime saleStartAt,

        OffsetDateTime saleEndAt,

        @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "Zone color must be a valid hex color code (e.g. #E11D48)")
        String zoneColor
) {}
