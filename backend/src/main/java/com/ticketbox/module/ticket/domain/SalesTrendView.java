package com.ticketbox.module.ticket.domain;

import java.math.BigDecimal;

public record SalesTrendView (
    String date, 
    long ticketsSold, 
    BigDecimal revenue
) {}