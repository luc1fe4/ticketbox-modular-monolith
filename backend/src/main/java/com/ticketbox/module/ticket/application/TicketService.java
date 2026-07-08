package com.ticketbox.module.ticket.application;

import com.ticketbox.module.concert.ConcertOrderPort;
import com.ticketbox.module.concert.ConcertView;
import com.ticketbox.module.concert.TicketTypeView;
import com.ticketbox.module.ticket.domain.Ticket;
import com.ticketbox.module.ticket.domain.TicketRepository;
import com.ticketbox.module.ticket.web.dto.TicketResponse;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketService {
    private final TicketRepository ticketRepository;
    private final ConcertOrderPort concertOrderPort;

    public List<TicketResponse> listUserTickets(UUID userId) {
        List<Ticket> tickets = ticketRepository.findByUserIdOrderByIssuedAtDesc(userId);
        if (tickets.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> concertIds = tickets.stream().map(Ticket::getConcertId).collect(Collectors.toSet());
        Set<UUID> ticketTypeIds = tickets.stream().map(Ticket::getTicketTypeId).collect(Collectors.toSet());

        Map<UUID, String> concertMap = concertOrderPort.findConcertsByIds(concertIds).stream()
                .collect(Collectors.toMap(ConcertView::id, ConcertView::title));
        Map<UUID, String> ticketTypeMap = concertOrderPort.findTicketTypesByIds(ticketTypeIds).stream()
                .collect(Collectors.toMap(TicketTypeView::id, TicketTypeView::name));

        return tickets.stream()
                .map(t -> new TicketResponse(
                        t.getId(),
                        t.getConcertId(),
                        concertMap.getOrDefault(t.getConcertId(), "Unknown Concert"),
                        t.getTicketTypeId(),
                        ticketTypeMap.getOrDefault(t.getTicketTypeId(), "Unknown Type"),
                        t.getQrCode(),
                        t.getStatus().name(),
                        t.getIssuedAt()
                ))
                .toList();
    }

    public TicketResponse getTicketDetail(UUID ticketId, UUID userId) {
        Ticket t = ticketRepository.findByIdAndUserId(ticketId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_FOUND, "Ticket not found"));

        ConcertView concert = concertOrderPort.findConcertById(t.getConcertId())
                .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Concert not found"));

        TicketTypeView ticketType = concertOrderPort.findTicketTypesByIds(List.of(t.getTicketTypeId())).stream()
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Ticket type not found"));

        return new TicketResponse(
                t.getId(),
                t.getConcertId(),
                concert.title(),
                t.getTicketTypeId(),
                ticketType.name(),
                t.getQrCode(),
                t.getStatus().name(),
                t.getIssuedAt()
        );
    }

    // ---- Admin / Organizer ----

    public List<TicketResponse> listConcertTickets(UUID concertId, String status) {
        List<Ticket> tickets;
        if (status != null) {
            tickets = ticketRepository.findByConcertIdAndStatus(concertId, Ticket.Status.valueOf(status));
        } else {
            tickets = ticketRepository.findByConcertId(concertId, Pageable.unpaged()).getContent();
        }

        if (tickets.isEmpty()) return Collections.emptyList();

        Set<UUID> ticketTypeIds = tickets.stream().map(Ticket::getTicketTypeId).collect(Collectors.toSet());
        Map<UUID, String> ticketTypeMap = concertOrderPort.findTicketTypesByIds(ticketTypeIds).stream()
                .collect(Collectors.toMap(TicketTypeView::id, TicketTypeView::name));

        ConcertView concert = concertOrderPort.findConcertById(concertId)
                .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Concert not found"));

        return tickets.stream()
                .map(t -> new TicketResponse(
                        t.getId(),
                        t.getConcertId(),
                        concert.title(),
                        t.getTicketTypeId(),
                        ticketTypeMap.getOrDefault(t.getTicketTypeId(), "Unknown Type"),
                        t.getQrCode(),
                        t.getStatus().name(),
                        t.getIssuedAt()
                ))
                .toList();
    }

    @Transactional
    public TicketResponse updateTicketStatus(UUID ticketId, String newStatus) {
        Ticket t = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_FOUND, "Ticket not found"));

        t.setStatus(Ticket.Status.valueOf(newStatus));
        ticketRepository.save(t);

        ConcertView concert = concertOrderPort.findConcertById(t.getConcertId())
                .orElseThrow(() -> new AppException(ErrorCode.CONCERT_NOT_FOUND, "Concert not found"));

        TicketTypeView ticketType = concertOrderPort.findTicketTypesByIds(List.of(t.getTicketTypeId())).stream()
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Ticket type not found"));

        return new TicketResponse(
                t.getId(),
                t.getConcertId(),
                concert.title(),
                t.getTicketTypeId(),
                ticketType.name(),
                t.getQrCode(),
                t.getStatus().name(),
                t.getIssuedAt()
        );
    }
}
