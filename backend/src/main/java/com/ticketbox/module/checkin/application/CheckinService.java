package com.ticketbox.module.checkin.application;

import com.ticketbox.module.checkin.domain.CheckinLog;
import com.ticketbox.module.checkin.domain.CheckinLogRepository;
import com.ticketbox.module.checkin.web.CheckinDatasetResponse;
import com.ticketbox.module.checkin.web.CheckinDatasetResponse.TicketDatasetEntry;
import com.ticketbox.module.checkin.web.ScanTicketRequest;
import com.ticketbox.module.checkin.web.ScanTicketResponse;
import com.ticketbox.module.checkin.web.SyncCheckinRequest;
import com.ticketbox.module.checkin.web.SyncCheckinResponse;
import com.ticketbox.module.checkin.web.SyncCheckinResponse.SyncResultEntry;
import com.ticketbox.module.ticket.domain.Ticket;
import com.ticketbox.module.ticket.domain.TicketRepository;
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

    private final TicketRepository ticketRepository;
    private final CheckinLogRepository checkinLogRepository;
    private final QrJwtService qrJwtService;
    private final CheckinSyncHelper checkinSyncHelper;

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

    @Transactional(readOnly = true)
    public CheckinDatasetResponse getCheckinDataset(UUID concertId) {
        List<Ticket> tickets = ticketRepository.findByConcertIdAndStatus(concertId, Ticket.Status.VALID);

        List<TicketDatasetEntry> entries = tickets.stream()
                .map(t -> new TicketDatasetEntry(
                        t.getId(),
                        t.getQrCode(),
                        t.getQrSecret(),
                        t.getTicketTypeId(),
                        t.getUserId()
                ))
                .toList();

        return new CheckinDatasetResponse(concertId, OffsetDateTime.now(), entries.size(), entries);
    }

    public SyncCheckinResponse syncOfflineLogs(SyncCheckinRequest request, UUID staffId) {
        List<SyncResultEntry> results = new ArrayList<>();
        int accepted = 0;
        int skipped  = 0;
        int invalid  = 0;

        for (SyncCheckinRequest.OfflineLogEntry entry : request.logs()) {

            Ticket ticket = ticketRepository.findByQrCode(entry.qrCode()).orElse(null);
            if (ticket == null) {
                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "QR code not found"));
                invalid++;
                continue;
            }

//            if (!qrJwtService.verify(entry.qrCode(), ticket.getQrSecret())) {
//                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "Invalid QR signature"));
//                invalid++;
//                continue;
//            }

            if (!ticket.getConcertId().equals(request.concertId())) {
                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "Ticket does not belong to this concert"));
                invalid++;
                continue;
            }

            if (ticket.getStatus() == Ticket.Status.CANCELLED
                    || ticket.getStatus() == Ticket.Status.TRANSFERRED) {
                results.add(new SyncResultEntry(entry.qrCode(), "INVALID", "Ticket is cancelled or transferred"));
                invalid++;
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
