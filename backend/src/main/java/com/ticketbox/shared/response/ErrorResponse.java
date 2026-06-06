package com.ticketbox.shared.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(int code, String message, Instant timestamp, Map<String, String> details) {
    public static ErrorResponse of(int code, String message) {
        return new ErrorResponse(code, message, Instant.now(), null);
    }

    public static ErrorResponse of(int code, String message, Map<String, String> details) {
        return new ErrorResponse(code, message, Instant.now(), details);
    }
}
