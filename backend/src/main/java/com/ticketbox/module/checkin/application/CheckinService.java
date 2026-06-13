package com.ticketbox.module.checkin.application;

import com.ticketbox.module.checkin.domain.CheckinLog;
import com.ticketbox.module.checkin.domain.CheckinLogRepository;
import com.ticketbox.module.checkin.web.dto.CheckinDatasetResponse;
import com.ticketbox.module.checkin.web.dto.CheckinDatasetResponse.TicketDatasetEntry;
import com.ticketbox.module.checkin.web.dto.ScanTicketRequest;
import com.ticketbox.module.checkin.web.dto.ScanTicketResponse;
import com.ticketbox.module.checkin.web.dto.SyncCheckinRequest;
import com.ticketbox.module.checkin.web.dto.SyncCheckinResponse;
import com.ticketbox.module.checkin.web.dto.SyncCheckinResponse.SyncResultEntry;
import com.ticketbox.module.ticket.domain.TicketCheckinPort;
import com.ticketbox.module.ticket.domain.TicketView;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckinService {

    private final TicketCheckinPort ticketCheckinPort;
    private final CheckinLogRepository checkinLogRepository;
    private final QrJwtService qrJwtService;
    private final CheckinSyncHelper checkinSyncHelper;

    @Transactional
    public ScanTicketResponse scan(ScanTicketRequest request, UUID staffId) {
        OffsetDateTime now = OffsetDateTime.now();

        TicketView ticket = ticketCheckinPort.findByQrCode(request.qrCode()).orElse(null);
        if (ticket == null) {
            return new ScanTicketResponse(null, request.concertId(), "FAILED", "Invalid QR code", now);
        }

        if (!ticket.concertId().equals(request.concertId())) {
            return new ScanTicketResponse(ticket.id(), ticket.concertId(), "FAILED", "Ticket does not belong to this concert", now);
        }

        if (!"VALID".equals(ticket.status())) {
            return new ScanTicketResponse(ticket.id(), ticket.concertId(), "FAILED", "Ticket is not valid for check-in", now);
        }

        try {
            CheckinLog log = new CheckinLog(
                    ticket.id(),
                    ticket.concertId(),
                    staffId,
                    request.deviceId(),
                    now,
                    false,
                    request.gate()
            );

            checkinLogRepository.saveAndFlush(log);

            ticketCheckinPort.markAsUsed(ticket.id(), now);

            return new ScanTicketResponse(
                    ticket.id(),
                    ticket.concertId(),
                    "SUCCESS",
                    "Check-in successful",
                    now
            );
        } catch (DataIntegrityViolationException ex) {
            return new ScanTicketResponse(ticket.id(), ticket.concertId(), "FAILED", "Duplicate check-in detected", now);
        }
    }

    @Transactional(readOnly = true)
    public CheckinDatasetResponse getCheckinDataset(UUID concertId) {
        List<TicketView> tickets = ticketCheckinPort.findByConcertIdAndStatusValid(concertId);

        List<TicketDatasetEntry> entries = tickets.stream()
                .map(t -> new TicketDatasetEntry(
                        t.id(),
                        t.qrCode(),
                        t.qrSecret(),
                        t.ticketTypeId(),
                        t.userId()
                ))
                .toList();

        return new CheckinDatasetResponse(concertId, OffsetDateTime.now(), entries.size(), entries);
    }

    @Transactional
    public SyncCheckinResponse syncOfflineLogs(SyncCheckinRequest request, UUID staffId) {
        List<SyncResultEntry> results = new ArrayList<>();
        int accepted = 0;
        int skipped  = 0;
        int invalid  = 0;

        for (SyncCheckinRequest.OfflineLogEntry entry : request.logs()) {

            TicketView ticket = ticketCheckinPort.findByQrCode(entry.qrCode()).orElse(null);
            if (ticket == null) {
                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "QR code not found"));
                invalid++;
                continue;
            }

            if (!qrJwtService.verify(entry.qrCode(), ticket.qrSecret())) {
                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "Invalid QR signature"));
                invalid++;
                continue;
            }

            if (!ticket.concertId().equals(request.concertId())) {
                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "Ticket does not belong to this concert"));
                invalid++;
                continue;
            }

            if ("CANCELLED".equals(ticket.status())
                    || "TRANSFERRED".equals(ticket.status())) {
                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "Ticket is cancelled or transferred"));
                invalid++;
                continue;
            }

            if ("USED".equals(ticket.status())) {
                results.add(new SyncResultEntry(entry.qrCode(), "SKIPPED", "Ticket was already used on the server"));
                skipped++;
                continue;
            }

            SyncResultEntry result = checkinSyncHelper.syncSingleEntry(
                    entry, ticket, staffId, request.deviceId());
            results.add(result);

            switch (result.result()) {
                case "ACCEPTED" -> accepted++;
                case "SKIPPED"  -> skipped++;
                default         -> invalid++;
            }
        }

        return new SyncCheckinResponse(request.logs().size(), accepted, skipped, invalid, results);
    }
}
