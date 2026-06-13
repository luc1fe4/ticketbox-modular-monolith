package com.ticketbox.module.checkin.web;

import com.ticketbox.module.checkin.application.CheckinService;
import com.ticketbox.module.checkin.web.dto.CheckinDatasetResponse;
import com.ticketbox.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<ApiResponse<CheckinDatasetResponse>> getDataset(@PathVariable UUID concertId) {
        return ResponseEntity.ok(ApiResponse.success(checkinService.getCheckinDataset(concertId)));
    }
}
