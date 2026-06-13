package com.ticketbox.module.concert.web;

import com.ticketbox.module.concert.application.TicketTypeService;
import com.ticketbox.module.concert.web.dto.TicketTypeResponse;
import com.ticketbox.module.concert.web.dto.CreateTicketTypeRequest;
import com.ticketbox.module.concert.web.dto.UpdateTicketTypeRequest;
import com.ticketbox.module.concert.web.dto.UpdateTicketTypeStatusRequest;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminTicketTypeController {

    private final TicketTypeService ticketTypeService;

    @GetMapping("/concerts/{concertId}/ticket-types")
    public ResponseEntity<ApiResponse<List<TicketTypeResponse>>> listTicketTypesForAdmin(
            @PathVariable UUID concertId
    ) {
        List<TicketTypeResponse> list = ticketTypeService.getTicketTypes(concertId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/concerts/{concertId}/ticket-types")
    public ResponseEntity<ApiResponse<TicketTypeResponse>> createTicketType(
            @PathVariable UUID concertId,
            @Valid @RequestBody CreateTicketTypeRequest request
    ) {
        TicketTypeResponse created = ticketTypeService.createTicketType(concertId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/ticket-types/{id}")
    public ResponseEntity<ApiResponse<TicketTypeResponse>> updateTicketType(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTicketTypeRequest request
    ) {
        TicketTypeResponse updated = ticketTypeService.updateTicketType(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @PatchMapping("/ticket-types/{id}/status")
    public ResponseEntity<ApiResponse<TicketTypeResponse>> changeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTicketTypeStatusRequest request
    ) {
        TicketTypeResponse updated = ticketTypeService.changeStatus(id, request.isActive());
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/ticket-types/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTicketType(
            @PathVariable UUID id
    ) {
        ticketTypeService.deleteTicketType(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
