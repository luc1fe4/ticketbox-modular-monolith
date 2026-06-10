package com.ticketbox.module.concert.web;

import com.ticketbox.module.auth.domain.User;
import com.ticketbox.module.concert.application.ConcertService;
import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.CreateConcertRequest;
import com.ticketbox.module.concert.application.dto.UpdateConcertRequest;
import com.ticketbox.module.concert.application.dto.UpdateStatusRequest;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/concerts")
public class AdminConcertController {

    private final ConcertService concertService;

    public AdminConcertController(ConcertService concertService) {
        this.concertService = concertService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ConcertDetailDto>>> listAllConcerts(
            @RequestParam(required = false) Concert.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());
        Page<ConcertDetailDto> concerts = concertService.getAllConcerts(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(concerts));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConcertDetailDto>> createConcert(
            @Valid @RequestBody CreateConcertRequest request,
            @AuthenticationPrincipal User user
    ) {
        ConcertDetailDto created = concertService.createConcert(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDetailDto>> getConcertForEdit(
            @PathVariable UUID id
    ) {
        ConcertDetailDto detail = concertService.getConcertDetail(id);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDetailDto>> updateConcert(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateConcertRequest request
    ) {
        ConcertDetailDto updated = concertService.updateConcert(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ConcertDetailDto>> changeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request
    ) {
        ConcertDetailDto updated = concertService.changeStatus(id, request.status());
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteConcert(
            @PathVariable UUID id
    ) {
        concertService.deleteConcert(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
