package com.ticketbox.module.checkin.web;

import com.ticketbox.module.checkin.application.CheckinService;
import com.ticketbox.module.checkin.web.dto.CheckinSummaryResponse;
import com.ticketbox.module.concert.application.ConcertService;
import com.ticketbox.shared.response.ApiResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes the same operational check-in snapshot to the organizer that owns the concert. */
@RestController
@RequestMapping("/api/organizer/manage/concerts")
@RequiredArgsConstructor
public class OrganizerCheckinSummaryController {

    private final ConcertService concertService;
    private final CheckinService checkinService;

    @GetMapping("/{concertId}/checkin-summary")
    public ResponseEntity<ApiResponse<CheckinSummaryResponse>> getCheckinSummary(
            @PathVariable UUID concertId,
            Authentication authentication) {
        concertService.getConcertForEdit(concertId, UUID.fromString(authentication.getName()), false);
        return ResponseEntity.ok(ApiResponse.success(checkinService.getCheckinSummary(concertId)));
    }
}
