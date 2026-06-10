package com.ticketbox.shared.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "Invalid request"),
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Validation failed"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Authentication required"),
    UNAUTHORIZED(HttpStatus.FORBIDDEN, "Access denied"),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"),

    DUPLICATE_IDEMPOTENCY_KEY(HttpStatus.CONFLICT, "Duplicate request detected"),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "Email is already registered"),
    TICKET_SOLD_OUT(HttpStatus.CONFLICT, "Tickets are sold out"),
    TICKET_LIMIT_EXCEEDED(HttpStatus.CONFLICT, "Ticket purchase limit exceeded"),
    PAYMENT_GATEWAY_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Payment gateway temporarily unavailable"),
    
    INVALID_STATUS_TRANSITION(HttpStatus.BAD_REQUEST, "Invalid status transition"),
    CONCERT_NOT_DELETABLE(HttpStatus.CONFLICT, "Concert can only be deleted in DRAFT status"),
    CONCERT_HAS_TICKET_TYPES(HttpStatus.CONFLICT, "Cannot delete concert with existing ticket types"),
    INVALID_DATE(HttpStatus.BAD_REQUEST, "Invalid date configuration");

    private final HttpStatus httpStatus;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
