package com.ticketbox.module.ticket.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByQrCode(String qrCode);
    List<Ticket> findByConcertIdAndStatus(UUID concertId, Ticket.Status status);
    List<Ticket> findByUserIdOrderByIssuedAtDesc(UUID userId);
    Optional<Ticket> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE Ticket t SET t.status = 'USED', t.usedAt = :usedAt WHERE t.id = :id AND t.status = 'VALID'")
    int markAsUsedIfValid(@Param("id") UUID id, @Param("usedAt") OffsetDateTime usedAt);
}
