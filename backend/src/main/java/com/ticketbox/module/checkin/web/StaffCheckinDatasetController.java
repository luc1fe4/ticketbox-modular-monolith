package com.ticketbox.module.checkin.web;

import com.ticketbox.module.checkin.application.CheckinService;
import com.ticketbox.module.checkin.web.dto.CheckinDatasetResponse;
import com.ticketbox.module.checkin.web.dto.CheckinHistoryResponse;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/staff/concerts")
@RequiredArgsConstructor
@Validated
public class StaffCheckinDatasetController {

    private final CheckinService checkinService;

    @GetMapping("/{concertId}/checkin-dataset")
    public ApiResponse<CheckinDatasetResponse> getDataset(@PathVariable UUID concertId) {
        return ApiResponse.success(checkinService.getCheckinDataset(concertId));
    }

    @GetMapping("/{concertId}/checkins")
    public ApiResponse<Page<CheckinHistoryResponse>> getCheckinHistory(
            @PathVariable UUID concertId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "checkedAt")
        );
        return ApiResponse.success(checkinService.getCheckinHistory(concertId, pageable));
    }
}
