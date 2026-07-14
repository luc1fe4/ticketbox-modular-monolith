package com.ticketbox.module.ticket.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketHoldRepository extends JpaRepository<TicketHold, UUID> {
    Optional<TicketHold> findByUserIdAndConcertIdAndTicketTypeId(UUID userId, UUID concertId, UUID ticketTypeId);
    List<TicketHold> findByUserIdAndConcertId(UUID userId, UUID concertId);
    List<TicketHold> findByExpiresAtBefore(OffsetDateTime time);
    void deleteByUserIdAndConcertId(UUID userId, UUID concertId);
}
