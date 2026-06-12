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

    @Modifying
    @Query(value = """
            UPDATE tickets
            SET status = 'USED', used_at = :usedAt
            WHERE id = :ticketId AND status = 'VALID'
            """, nativeQuery = true)
    int markAsUsedIfValid(
            @Param("ticketId") UUID ticketId,
            @Param("usedAt") OffsetDateTime usedAt
    );
}
