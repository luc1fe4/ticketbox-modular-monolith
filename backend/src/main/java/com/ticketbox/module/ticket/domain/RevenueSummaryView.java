package com.ticketbox.module.ticket.domain;

import java.math.BigDecimal;

public record RevenueSummaryView (
    BigDecimal totalRevenue, 
    long totalTicketsSold
) {}
