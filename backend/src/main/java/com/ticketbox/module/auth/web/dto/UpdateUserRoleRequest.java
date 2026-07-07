package com.ticketbox.module.auth.web.dto;

import com.ticketbox.module.auth.domain.User;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
        @NotNull(message = "Role is required")
        User.Role role
) {}
