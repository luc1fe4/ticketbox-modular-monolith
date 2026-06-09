package com.ticketbox.module.checkin.application;

import com.ticketbox.module.checkin.domain.CheckinLog;
import com.ticketbox.module.checkin.domain.CheckinLogRepository;
import com.ticketbox.module.checkin.web.ScanTicketRequest;
import com.ticketbox.module.checkin.web.ScanTicketResponse;
import com.ticketbox.module.ticket.domain.Ticket;
import com.ticketbox.module.ticket.domain.TicketRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CheckinService {
    private final TicketRepository ticketRepository;
    private final CheckinLogRepository checkinLogRepository;

    @Transactional
    public ScanTicketResponse scan(ScanTicketRequest request, UUID staffId) {
        OffsetDateTime now = OffsetDateTime.now();

        Ticket ticket = ticketRepository.findByQrCode(request.qrCode()).orElse(null);
        if (ticket == null) {
            return new ScanTicketResponse(null, request.concertId(), "FAILED", "Invalid QR code", now);
        }

        if (!ticket.getConcertId().equals(request.concertId())) {
            return new ScanTicketResponse(ticket.getId(), ticket.getConcertId(), "FAILED", "Ticket does not belong to this concert", now);
        }

        if (!Ticket.Status.VALID.equals(ticket.getStatus())) {
            return new ScanTicketResponse(ticket.getId(), ticket.getConcertId(), "FAILED", "Ticket is not valid for check-in", now);
        }

        try {
            CheckinLog log = new CheckinLog(
                    ticket.getId(),
                    ticket.getConcertId(),
                    staffId,
                    request.deviceId(),
                    now,
                    false,
                    request.gate()
            );

            checkinLogRepository.saveAndFlush(log);

            ticket.setStatus(Ticket.Status.USED);
            ticket.setUsedAt(now);
            ticketRepository.save(ticket);

            return new ScanTicketResponse(
                    ticket.getId(),
                    ticket.getConcertId(),
                    "SUCCESS",
                    "Check-in successful",
                    now
            );
        } catch (DataIntegrityViolationException ex) {
            return new ScanTicketResponse(ticket.getId(), ticket.getConcertId(), "FAILED", "Duplicate check-in detected", now);
        }
    }
}
