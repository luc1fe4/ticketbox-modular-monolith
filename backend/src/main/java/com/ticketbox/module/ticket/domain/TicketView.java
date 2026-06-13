package com.ticketbox.module.ticket.domain;

import java.util.UUID;

public record TicketView(UUID id, UUID concertId, UUID ticketTypeId, UUID userId,
                         String qrCode, String qrSecret, String status) {}