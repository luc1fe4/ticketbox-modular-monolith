package com.ticketbox.module.auth.web.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "isActive is required")
        Boolean isActive
) {}
