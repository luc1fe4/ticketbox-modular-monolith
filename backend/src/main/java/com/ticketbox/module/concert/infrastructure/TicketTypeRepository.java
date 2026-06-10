package com.ticketbox.module.concert.infrastructure;

import com.ticketbox.module.concert.domain.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TicketTypeRepository extends JpaRepository<TicketType, UUID> {
    boolean existsByConcertId(UUID concertId);
    void deleteByConcertId(UUID concertId);
    List<TicketType> findByConcertId(UUID concertId);
    List<TicketType> findByConcertIdAndIsActiveTrue(UUID concertId);
}
