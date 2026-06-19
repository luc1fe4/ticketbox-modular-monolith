package com.ticketbox.module.admin.application;

import com.ticketbox.module.admin.domain.GuestList;
import com.ticketbox.module.admin.domain.GuestListRepository;
import com.ticketbox.module.admin.web.dto.GuestLookupResponse;
import com.ticketbox.shared.util.PhoneNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GuestListService {

    private final GuestListRepository guestListRepository;
    private final PhoneNormalizer phoneNormalizer;

    @Transactional(readOnly = true)
    public GuestLookupResponse findActiveGuest(UUID concertId, String phone) {
        String normalizedPhone = phoneNormalizer.normalize(phone);
        if (normalizedPhone == null) {
            return GuestLookupResponse.notFound();
        }

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
