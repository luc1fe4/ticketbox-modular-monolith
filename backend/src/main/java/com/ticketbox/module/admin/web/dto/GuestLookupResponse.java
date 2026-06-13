package com.ticketbox.module.admin.web.dto;

import java.util.UUID;

public record GuestLookupResponse(
        boolean found,
        UUID guestId,
        UUID concertId,
        String phone,
        String fullName,
        String category,
        String sponsorName,
        String notes
) {
    public static GuestLookupResponse notFound() {
        return new GuestLookupResponse(false, null, null, null, null, null, null, null);
    }
}
