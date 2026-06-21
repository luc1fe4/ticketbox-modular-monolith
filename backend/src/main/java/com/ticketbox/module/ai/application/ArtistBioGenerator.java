package com.ticketbox.module.ai.application;

public interface ArtistBioGenerator {
    String provider();
    String model();
    ArtistBioGenerationResult generate(ArtistBioGenerationRequest request);
}
