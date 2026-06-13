package com.ticketbox.module.ticket.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    @NotNull(message = "Concert ID is required")
    UUID concertId,

    @NotEmpty(message = "Order items cannot be empty")
    @Valid
    List<OrderItemRequest> items
) {}
