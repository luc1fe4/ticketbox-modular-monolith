package com.ticketbox.module.concert.web;

import com.ticketbox.module.concert.application.ConcertService;
import com.ticketbox.module.concert.application.TicketTypeService;
import com.ticketbox.module.concert.web.dto.ConcertDetailResponse;
import com.ticketbox.module.concert.web.dto.ConcertSeatMapResponse;
import com.ticketbox.module.concert.web.dto.ConcertSummaryResponse;
import com.ticketbox.module.concert.web.dto.TicketTypeResponse;
import com.ticketbox.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/concerts")
@RequiredArgsConstructor
public class ConcertController {

    private final ConcertService concertService;
    private final TicketTypeService ticketTypeService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ConcertSummaryResponse>>> listConcerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());

        Page<ConcertSummaryResponse> concerts = concertService.getPublicConcerts(pageable);

        return ResponseEntity.ok(ApiResponse.success(concerts));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDetailResponse>> getConcertDetail(
            @PathVariable UUID id
    ) {
        ConcertDetailResponse detail = concertService.getConcertDetail(id);

        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    @GetMapping("/{concertId}/seat-map")
    public ResponseEntity<ApiResponse<ConcertSeatMapResponse>> getConcertSeatMap(
            @PathVariable UUID concertId
    ) {
        ConcertSeatMapResponse seatMap = concertService.getConcertSeatMap(concertId);

        return ResponseEntity.ok(ApiResponse.success(seatMap));
    }

    @GetMapping("/{concertId}/ticket-types")
    public ResponseEntity<ApiResponse<List<TicketTypeResponse>>> getConcertTicketTypes(
            @PathVariable UUID concertId
    ) {
        List<TicketTypeResponse> ticketTypes = ticketTypeService.getPublicTicketTypes(concertId);

        return ResponseEntity.ok(ApiResponse.success(ticketTypes));
    }
}
