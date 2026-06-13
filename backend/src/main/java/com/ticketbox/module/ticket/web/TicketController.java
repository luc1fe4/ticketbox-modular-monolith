package com.ticketbox.module.ticket.web;

import com.ticketbox.module.ticket.web.dto.TicketResponse;
import com.ticketbox.module.ticket.application.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {
    private final TicketService ticketService;

    @GetMapping
    public ResponseEntity<List<TicketResponse>> getMyTickets(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(ticketService.listUserTickets(userId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<TicketResponse>> getMyTicketsAlias(Authentication authentication) {
        return getMyTickets(authentication);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketDetail(@PathVariable UUID id, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(ticketService.getTicketDetail(id, userId));
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<String> getTicketQrPayload(@PathVariable UUID id, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        TicketResponse detail = ticketService.getTicketDetail(id, userId);
        return ResponseEntity.ok(detail.qrCode());
    }
}
