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

/**
 * REST Controller for public concert endpoints.
 *
 * This is the "front door" of the concert module:
 * - Receives HTTP requests from the frontend
 * - Delegates to ConcertService for business logic
 * - Returns formatted JSON responses
 *
 * @RestController = @Controller + @ResponseBody
 *   → Tells Spring: "all methods return JSON (not HTML pages)"
 *
 * @RequestMapping("/api/concerts")
 *   → Base URL: all endpoints in this class start with /api/concerts
 */
@RestController
@RequestMapping("/api/concerts")
public class ConcertController {

    private final ConcertService concertService;

    // Spring auto-injects ConcertService here (Constructor Injection)
    public ConcertController(ConcertService concertService) {
        this.concertService = concertService;
    }

    /**
     * GET /api/concerts?page=0&size=10
     *
     * List public concerts with pagination.
     * No authentication required — anyone can browse concerts.
     *
     * @param page which page to return (0-based, default: 0 = first page)
     * @param size how many concerts per page (default: 10)
     * @return paginated list of concert summaries, sorted by event date ascending
     *
     * Example request:  GET /api/concerts?page=0&size=5
     * Example response:
     * {
     *   "code": 200,
     *   "message": "Success",
     *   "data": {
     *     "content": [ ... concerts ... ],
     *     "totalElements": 25,
     *     "totalPages": 5,
     *     "number": 0,
     *     "size": 5
     *   }
     * }
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ConcertSummaryDto>>> listConcerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        // Create a Pageable object: page number + size + sort by eventDate ascending
        // Sort ascending = soonest concerts first
        Pageable pageable = PageRequest.of(page, size, Sort.by("eventDate").ascending());

        Page<ConcertSummaryDto> concerts = concertService.getPublicConcerts(pageable);

        return ResponseEntity.ok(ApiResponse.success(concerts));
    }

    /**
     * GET /api/concerts/{id}
     *
     * Get full concert detail including artist_bio.
     * No authentication required — anyone can view concert details.
     *
     * @param id the UUID of the concert (from the URL path)
     * @return full concert detail
     *
     * Example request:  GET /api/concerts/a1b2c3d4-5678-...
     * Returns 404 if concert not found.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConcertDetailDto>> getConcertDetail(
            @PathVariable UUID id
    ) {
        ConcertDetailDto detail = concertService.getConcertDetail(id);

        return ResponseEntity.ok(ApiResponse.success(detail));
    }
}
