package com.ticketbox.module.checkin.web;

import com.ticketbox.module.checkin.application.CheckinService;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/checkins")
@RequiredArgsConstructor
public class StaffCheckinController {

    private final CheckinService checkinService;

    @PostMapping("/scan")
    public ApiResponse<ScanTicketResponse> scan(
            @Valid @RequestBody ScanTicketRequest request,
            Authentication authentication)
    {
         UUID staffId = UUID.fromString(authentication.getName());
        return ApiResponse.success(checkinService.scan(request, staffId));
    }

    @PostMapping("/sync")
    public ApiResponse<SyncCheckinResponse> sync(
            @Valid @RequestBody SyncCheckinRequest request,
            Authentication authentication)
    {
        UUID staffId = UUID.fromString(authentication.getName());
        return ApiResponse.success(checkinService.syncOfflineLogs(request, staffId));
    }
}