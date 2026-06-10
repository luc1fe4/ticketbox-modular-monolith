package com.ticketbox.module.concert.web;

import com.ticketbox.module.concert.application.ConcertService;
import com.ticketbox.module.concert.application.TicketTypeService;
import com.ticketbox.module.concert.application.dto.ConcertDetailDto;
import com.ticketbox.module.concert.application.dto.ConcertSummaryDto;
import com.ticketbox.module.concert.application.dto.TicketTypeDto;
import com.ticketbox.module.concert.application.dto.TicketTypeAvailabilityDto;
import com.ticketbox.shared.response.ApiResponse;

import java.util.List;
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
    private final TicketTypeService ticketTypeService;

    public ConcertController(ConcertService concertService, TicketTypeService ticketTypeService) {
        this.concertService = concertService;
        this.ticketTypeService = ticketTypeService;
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

    @GetMapping("/{concertId}/ticket-types")
    public ResponseEntity<ApiResponse<List<TicketTypeDto>>> getConcertTicketTypes(
            @PathVariable UUID concertId
    ) {
        List<TicketTypeDto> list = ticketTypeService.getActiveTicketTypes(concertId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{concertId}/availability")
    public ResponseEntity<ApiResponse<TicketTypeAvailabilityDto>> getAvailability(
            @PathVariable UUID concertId
    ) {
        TicketTypeAvailabilityDto availability = ticketTypeService.getAvailability(concertId);
        return ResponseEntity.ok(ApiResponse.success(availability));
    }
}
