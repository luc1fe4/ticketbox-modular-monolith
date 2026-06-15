package com.ticketbox.module.ticket.infrastructure;

import com.ticketbox.module.ticket.domain.Ticket;
import com.ticketbox.module.ticket.TicketCheckinPort;
import com.ticketbox.module.ticket.domain.TicketRepository;
import com.ticketbox.module.ticket.TicketView;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TicketCheckinAdapter implements TicketCheckinPort {
    private final TicketRepository ticketRepository;

    @Override
    public Optional<TicketView> findByQrCode(String qrCode) {
        return ticketRepository.findByQrCode(qrCode)
                .map(this::toView);
    }

    @Override
    public List<TicketView> findByConcertIdAndStatusValid(UUID concertId) {
        return ticketRepository.findByConcertIdAndStatus(concertId, Ticket.Status.VALID)
                .stream()
                .map(this::toView)
                .toList();
    }

    @Override
    public void markAsUsed(UUID ticketId, OffsetDateTime usedAt) {
        ticketRepository.findById(ticketId).ifPresent(ticket -> {
            ticket.setStatus(Ticket.Status.USED);
            ticket.setUsedAt(usedAt);
            ticketRepository.save(ticket);
        });
    }

    @Override
    public boolean markAsUsedIfValid(UUID ticketId, OffsetDateTime usedAt) {
        return ticketRepository.markAsUsedIfValid(ticketId, usedAt) == 1;
    }

    private TicketView toView(Ticket t) {
        return new TicketView(
                t.getId(),
                t.getConcertId(),
                t.getTicketTypeId(),
                t.getUserId(),
                t.getQrCode(),
                t.getQrSecret(),
                t.getStatus().name()
        );
    }
}
