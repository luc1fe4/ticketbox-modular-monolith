package com.ticketbox.module.checkin.application;

import com.ticketbox.module.checkin.domain.CheckinLog;
import com.ticketbox.module.checkin.domain.CheckinLogRepository;
import com.ticketbox.module.checkin.web.dto.SyncCheckinRequest;
import com.ticketbox.module.checkin.web.dto.SyncCheckinResponse.SyncResultEntry;
import com.ticketbox.module.ticket.domain.TicketCheckinPort;
import com.ticketbox.module.ticket.domain.TicketView;
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
    private final TicketCheckinPort ticketCheckinPort;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncResultEntry syncSingleEntry(
            SyncCheckinRequest.OfflineLogEntry entry,
            TicketView ticket,
            UUID staffId,
            String deviceId
    ) {
        if (checkinLogRepository.existsByTicketId(ticket.id())) {
            return new SyncResultEntry(
                    entry.qrCode(),
                    "SKIPPED",
                    "Ticket already checked-in"
            );
        }

        OffsetDateTime now = OffsetDateTime.now();

        CheckinLog log = new CheckinLog(
                ticket.id(),
                ticket.concertId(),
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

            ticketCheckinPort.markAsUsed(ticket.id(), entry.checkedAt());

            return new SyncResultEntry(entry.qrCode(), "ACCEPTED", "Check-in recorded successfully");

        } catch (DataIntegrityViolationException ex) {
            return new SyncResultEntry(entry.qrCode(), "SKIPPED", "Ticket already checked-in");
        }
    }
}
