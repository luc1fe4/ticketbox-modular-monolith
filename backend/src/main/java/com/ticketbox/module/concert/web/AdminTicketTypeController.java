package com.ticketbox.module.concert.web;

import com.ticketbox.module.concert.application.TicketTypeService;
import com.ticketbox.module.concert.application.dto.TicketTypeDto;
import com.ticketbox.module.concert.application.dto.CreateTicketTypeRequest;
import com.ticketbox.module.concert.application.dto.UpdateTicketTypeRequest;
import com.ticketbox.module.concert.application.dto.UpdateTicketTypeStatusRequest;
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
    public ResponseEntity<ApiResponse<List<TicketTypeDto>>> listTicketTypesForAdmin(
            @PathVariable UUID concertId
    ) {
        List<TicketTypeDto> list = ticketTypeService.getTicketTypes(concertId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/concerts/{concertId}/ticket-types")
    public ResponseEntity<ApiResponse<TicketTypeDto>> createTicketType(
            @PathVariable UUID concertId,
            @Valid @RequestBody CreateTicketTypeRequest request
    ) {
        TicketTypeDto created = ticketTypeService.createTicketType(concertId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @PutMapping("/ticket-types/{id}")
    public ResponseEntity<ApiResponse<TicketTypeDto>> updateTicketType(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTicketTypeRequest request
    ) {
        TicketTypeDto updated = ticketTypeService.updateTicketType(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @PatchMapping("/ticket-types/{id}/status")
    public ResponseEntity<ApiResponse<TicketTypeDto>> changeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTicketTypeStatusRequest request
    ) {
        TicketTypeDto updated = ticketTypeService.changeStatus(id, request.isActive());
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
