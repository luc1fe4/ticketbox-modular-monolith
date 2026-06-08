package com.ticketbox.module.concert.web;

import com.ticketbox.module.concert.application.ConcertService;
import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.ConcertSummaryDto;
import com.ticketbox.shared.response.ApiResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/concerts")
public class ConcertController {

    private final ConcertService concertService;

    public ConcertController(ConcertService concertService) {
        this.concertService = concertService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ConcertSummaryDto>>> listConcerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());

        Page<ConcertSummaryDto> concerts = concertService.getPublicConcerts(pageable);

        return ResponseEntity.ok(ApiResponse.success(concerts));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDetailDto>> getConcertDetail(
            @PathVariable UUID id
    ) {
        ConcertDetailDto detail = concertService.getConcertDetail(id);

        return ResponseEntity.ok(ApiResponse.success(detail));
    }
}
