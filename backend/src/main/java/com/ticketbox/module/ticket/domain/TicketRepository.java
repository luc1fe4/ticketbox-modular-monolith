package com.ticketbox.module.ticket.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByQrCode(String qrCode);
    List<Ticket> findByConcertIdAndStatus(UUID concertId, Ticket.Status status);
}
