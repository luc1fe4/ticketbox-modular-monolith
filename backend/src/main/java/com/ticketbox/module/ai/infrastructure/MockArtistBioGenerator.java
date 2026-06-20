package com.ticketbox.module.ai.infrastructure;

import com.ticketbox.module.ai.application.ArtistBioGenerationRequest;
import com.ticketbox.module.ai.application.ArtistBioGenerationResult;
import com.ticketbox.module.ai.application.ArtistBioGenerator;
import org.springframework.stereotype.Component;

@Component
public class MockArtistBioGenerator implements ArtistBioGenerator {

    @Override
    public String provider() {
        return "mock";
    }

    @Override
    public String model() {
        return "local-deterministic";
    }

    @Override
    public ArtistBioGenerationResult generate(ArtistBioGenerationRequest request) {
        String excerpt = request.sourceText().length() > 700
                ? request.sourceText().substring(0, 700).trim()
                : request.sourceText().trim();
        String bio = request.concertTitle() + ": " + excerpt;
        return new ArtistBioGenerationResult(bio, provider(), model());
    }
}
