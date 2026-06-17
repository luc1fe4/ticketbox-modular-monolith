package com.ticketbox.module.concert.infrastructure;

import com.ticketbox.module.concert.ConcertReminderPort;
import com.ticketbox.module.concert.ConcertReminderView;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.module.concert.domain.ConcertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ConcertReminderAdapter implements ConcertReminderPort {

    private final ConcertRepository concertRepository;

    @Override
    public List<ConcertReminderView> findConcertsStartingBetween(
            OffsetDateTime from,
            OffsetDateTime to
    ) {
        return concertRepository
                .findByEventDateBetweenAndStatusIn(
                        from,
                        to,
                        List.of(Concert.Status.ON_SALE, Concert.Status.SOLD_OUT)
                )
                .stream()
                .map(c -> new ConcertReminderView(
                        c.getId(),
                        c.getTitle(),
                        c.getVenueName(),
                        c.getVenueAddress(),
                        c.getEventDate()
                ))
                .toList();
    }
}
