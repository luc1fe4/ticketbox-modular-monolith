package com.ticketbox.module.ticket.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketCheckinPort {
    Optional<TicketView> findByQrCode(String qrCode);
    List<TicketView> findByConcertIdAndStatusValid(UUID concertId);
    void markAsUsed(UUID ticketId, OffsetDateTime usedAt);
}
