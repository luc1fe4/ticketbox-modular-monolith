package com.ticketbox.module.concert.application.dto;

import com.ticketbox.module.concert.domain.Concert;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
        @NotNull(message = "Status must not be null")
        Concert.Status status
) {}
