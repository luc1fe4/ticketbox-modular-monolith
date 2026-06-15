package com.ticketbox.module.ticket;

import java.util.UUID;

public record TicketView(UUID id, UUID concertId, UUID ticketTypeId, UUID userId,
                         String qrCode, String qrSecret, String status) {}
