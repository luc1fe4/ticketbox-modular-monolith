package com.ticketbox.module.checkin.application;

import com.ticketbox.module.checkin.domain.CheckinLog;
import com.ticketbox.module.checkin.domain.CheckinLogRepository;
import com.ticketbox.module.checkin.web.SyncCheckinRequest;
import com.ticketbox.module.checkin.web.SyncCheckinResponse.SyncResultEntry;
import com.ticketbox.module.ticket.domain.Ticket;
import com.ticketbox.module.ticket.domain.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckinSyncHelper {

    private final CheckinLogRepository checkinLogRepository;
    private final TicketRepository ticketRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncResultEntry syncSingleEntry(
            SyncCheckinRequest.OfflineLogEntry entry,
            Ticket ticket,
            UUID staffId,
            String deviceId
    ) {
        if (checkinLogRepository.existsByTicketId(ticket.getId())) {
            return new SyncResultEntry(
                    entry.qrCode(),
                    "SKIPPED",
                    "Ticket already checked-in"
            );
        }

        OffsetDateTime now = OffsetDateTime.now();

        CheckinLog log = new CheckinLog(
                ticket.getId(),
                ticket.getConcertId(),
                staffId,
                deviceId,
                entry.checkedAt(),
                true,
                entry.gate()
        );
        log.setSyncAt(now);
        if (entry.notes() != null) {
            log.setNotes(entry.notes());
        }

        try {
            checkinLogRepository.saveAndFlush(log);

            ticket.setStatus(Ticket.Status.USED);
            ticket.setUsedAt(entry.checkedAt());
            ticketRepository.save(ticket);

            return new SyncResultEntry(entry.qrCode(), "ACCEPTED", "Check-in recorded successfully");

        } catch (DataIntegrityViolationException ex) {
            return new SyncResultEntry(entry.qrCode(), "SKIPPED", "Ticket already checked-in");
        }
    }
}
