package com.ticketbox.module.ai.application;

public record ArtistBioGenerationRequest(
        String concertTitle,
        String sourceText,
        String language,
        int desiredLength) {
}
