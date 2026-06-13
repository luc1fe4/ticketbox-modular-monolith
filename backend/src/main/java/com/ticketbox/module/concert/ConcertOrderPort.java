package com.ticketbox.module.concert;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConcertOrderPort {
    Optional<ConcertView> findConcertById(UUID concertId);
    List<ConcertView> findConcertsByIds(Collection<UUID> concertIds);
    List<TicketTypeView> findTicketTypesByIds(Collection<UUID> ticketTypeIds);
}
