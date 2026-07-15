package com.ticketbox.module.ticket;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderView(
        UUID id,
        UUID userId,
        BigDecimal totalAmount,
        String status,
        String paymentProvider,
        String paymentRef,
        String paymentUrl
) {}
