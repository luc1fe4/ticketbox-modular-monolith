package com.ticketbox.module.concert.web;

import com.ticketbox.module.concert.application.ConcertService;
import com.ticketbox.module.concert.web.dto.ConcertDetailResponse;
import com.ticketbox.module.concert.web.dto.CreateConcertRequest;
import com.ticketbox.module.concert.web.dto.UpdateConcertRequest;
import com.ticketbox.module.concert.web.dto.UpdateStatusRequest;
import com.ticketbox.module.concert.domain.Concert;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/concerts")
@RequiredArgsConstructor
public class AdminConcertController {

    private final ConcertService concertService;


    @GetMapping
    public ResponseEntity<ApiResponse<Page<ConcertDetailResponse>>> listAllConcerts(
            @RequestParam(required = false) Concert.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());
        Page<ConcertDetailResponse> concerts = concertService.getAllConcerts(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(concerts));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConcertDetailResponse>> createConcert(
            @Valid @RequestBody CreateConcertRequest request,
            Authentication authentication
    ) {
        UUID organizerId = UUID.fromString(authentication.getName());
        ConcertDetailResponse created = concertService.createConcert(request, organizerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDetailResponse>> getConcertForEdit(
            @PathVariable UUID id
    ) {
        ConcertDetailResponse detail = concertService.getConcertDetail(id);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDetailResponse>> updateConcert(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateConcertRequest request
    ) {
        ConcertDetailResponse updated = concertService.updateConcert(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ConcertDetailResponse>> changeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request
    ) {
        ConcertDetailResponse updated = concertService.changeStatus(id, request.status());
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
