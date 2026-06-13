package com.ticketbox.module.auth.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
        @Size(max = 255, message = "Full name must be at most 255 characters")
        @Pattern(regexp = ".*\\S.*", message = "Full name must not be blank")
        String fullName,

        @Size(max = 20, message = "Phone must be at most 20 characters")
        String phone
) {}
