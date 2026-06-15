package com.ticketbox.module.admin.web;

import com.ticketbox.module.admin.application.GuestListService;
import com.ticketbox.module.admin.web.dto.GuestLookupResponse;
import com.ticketbox.shared.response.ApiResponse;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/staff/guestlist")
@RequiredArgsConstructor
@Validated
public class StaffGuestListController {

    private final GuestListService guestListService;

    @GetMapping
    public ApiResponse<GuestLookupResponse> findGuest(
            @RequestParam(name = "concert_id") UUID concertId,
            @RequestParam @NotBlank String phone
    ) {
        return ApiResponse.success(guestListService.findActiveGuest(concertId, phone));
    }
}
