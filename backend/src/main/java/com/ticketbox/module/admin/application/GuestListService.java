package com.ticketbox.module.admin.application;

import com.ticketbox.module.admin.domain.GuestList;
import com.ticketbox.module.admin.domain.GuestListRepository;
import com.ticketbox.module.admin.web.dto.GuestLookupResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GuestListService {

    private final GuestListRepository guestListRepository;

    @Transactional(readOnly = true)
    public GuestLookupResponse findActiveGuest(UUID concertId, String phone) {
        String normalizedPhone = phone.trim();

        return guestListRepository
                .findByConcertIdAndPhoneAndIsActiveTrue(concertId, normalizedPhone)
                .map(this::toResponse)
                .orElseGet(GuestLookupResponse::notFound);
    }

    private GuestLookupResponse toResponse(GuestList guest) {
        return new GuestLookupResponse(
                true,
                guest.getId(),
                guest.getConcertId(),
                guest.getPhone(),
                guest.getFullName(),
                guest.getCategory(),
                guest.getSponsorName(),
                guest.getNotes()
        );
    }
}
