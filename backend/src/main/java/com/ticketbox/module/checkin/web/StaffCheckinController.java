package com.ticketbox.module.checkin.web;

import com.ticketbox.module.checkin.application.CheckinService;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/checkins")
@RequiredArgsConstructor
public class StaffCheckinController {

    private final CheckinService checkinService;

    @PostMapping("/scan")
    public ApiResponse<ScanTicketResponse> scan(
            @Valid @RequestBody ScanTicketRequest request) {
        // UUID staffId = UUID.fromString(authentication.getName());
        UUID staffId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        return ApiResponse.success(checkinService.scan(request, staffId));
    }
}