package com.ticketbox.module.admin.application;

import com.ticketbox.module.admin.domain.GuestList;
import com.ticketbox.module.admin.domain.GuestListRepository;
import com.ticketbox.module.admin.web.dto.GuestLookupResponse;
import com.ticketbox.shared.util.PhoneNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import com.ticketbox.shared.exception.AppException;
import com.ticketbox.shared.exception.ErrorCode;

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

    @Transactional(readOnly = true)
    public java.util.List<GuestList> getGuestListByConcertId(UUID concertId) {
        return guestListRepository.findAllByConcertId(concertId);
    }

    @Transactional
    public GuestLookupResponse checkIn(UUID guestId, UUID concertId, UUID staffId, String gate) {
        String normalizedGate = gate == null || gate.isBlank() ? "VIP" : gate.trim();
        int updated = guestListRepository.checkInIfEligible(
                guestId, concertId, staffId, normalizedGate, java.time.OffsetDateTime.now());
        GuestList guest = guestListRepository.findById(guestId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Guest not found"));
        if (!guest.getConcertId().equals(concertId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Guest does not belong to this concert");
        }
        if (updated == 0 && guest.getCheckedInAt() == null) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, "Guest is inactive and cannot be checked in");
        }
        return toResponse(guest);
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
                guest.getNotes(),
                guest.getCheckedInAt(),
                guest.getCheckinGate()
        );
    }
}
