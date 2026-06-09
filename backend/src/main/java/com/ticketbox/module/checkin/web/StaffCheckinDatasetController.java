package com.ticketbox.module.checkin.web;

import com.ticketbox.module.checkin.application.CheckinService;
import com.ticketbox.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/staff/concerts")
@RequiredArgsConstructor
public class StaffCheckinDatasetController {

    private final CheckinService checkinService;

    @GetMapping("/{concertId}/checkin-dataset")
    public ApiResponse<CheckinDatasetResponse> getDataset(@PathVariable UUID concertId) {
        return ApiResponse.success(checkinService.getCheckinDataset(concertId));
    }
}
