package com.ticketbox.infrastructure.redis;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "ticketbox.rate-limit")
public record RateLimitProperties(
        @Valid @NotNull Policy purchase,
        @Valid @NotNull Policy payment
) {
    public record Policy(
            @Min(1) long capacity,
            @Min(1) long refillTokens,
            @NotNull Duration refillPeriod
    ) {
    }
}
