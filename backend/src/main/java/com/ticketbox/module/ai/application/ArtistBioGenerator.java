package com.ticketbox.module.ai.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtistBioGenerator {

    @Value("${ticketbox.ai.api-key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateBio(String cleanedText) {
        if (!StringUtils.hasText(apiKey) || apiKey.equalsIgnoreCase("mock") || apiKey.contains("replace-with")) {
            log.info("AI API key not configured or set to mock. Using mock fallback bio generator.");
            return generateMockBio(cleanedText);
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String prompt = "Based on the following extracted artist information, write a clean, professional, and engaging biography of about 150-250 words. Focus on their musical style, accomplishments, and history. Keep it formal and ready for a concert marketing page:\n\n" + cleanedText;

            GeminiRequest requestPayload = new GeminiRequest(
                    List.of(new GeminiRequest.Content(
                            List.of(new GeminiRequest.Part(prompt))
                    ))
            );

            HttpEntity<GeminiRequest> entity = new HttpEntity<>(requestPayload, headers);
            log.info("Calling Gemini API to generate artist bio...");
            GeminiResponse response = restTemplate.postForObject(url, entity, GeminiResponse.class);

            if (response != null && response.candidates() != null && !response.candidates().isEmpty()) {
                GeminiResponse.Candidate candidate = response.candidates().get(0);
                if (candidate.content() != null && candidate.content().parts() != null && !candidate.content().parts().isEmpty()) {
                    String generatedText = candidate.content().parts().get(0).text();
                    if (StringUtils.hasText(generatedText)) {
                        log.info("Successfully generated bio using Gemini API.");
                        return generatedText.trim();
                    }
                }
            }
            log.warn("Gemini API returned empty response. Falling back to mock bio.");
            return generateMockBio(cleanedText);

        } catch (Exception e) {
            log.error("Error occurred while calling Gemini API: " + e.getMessage() + ". Falling back to mock bio.", e);
            return generateMockBio(cleanedText);
        }
    }

    private String generateMockBio(String text) {
        log.info("Generating mock fallback bio based on extracted text length: {}", text.length());
        
        // Try to search for some artist keywords
        String artistName = "Nghệ sĩ";
        if (text.contains("Sơn Tùng") || text.contains("M-TP")) {
            artistName = "Sơn Tùng M-TP";
        } else if (text.contains("Đen Vâu") || text.contains("Đen")) {
            artistName = "Đen Vâu";
        } else if (text.contains("Suboi")) {
            artistName = "Suboi";
        } else if (text.contains("Mỹ Tâm")) {
            artistName = "Mỹ Tâm";
        } else if (text.contains("Hoàng Thùy Linh")) {
            artistName = "Hoàng Thùy Linh";
        } else {
            // Attempt simple line scanning to find potential artist name
            String[] lines = text.split("\n");
            for (String line : lines) {
                line = line.trim();
                if (line.length() > 2 && line.length() < 50 && (line.contains("Name:") || line.contains("Tên:") || line.toLowerCase().startsWith("artist:"))) {
                    artistName = line.replaceAll("(?i)(Name:|Tên:|Artist:)", "").trim();
                    break;
                }
            }
        }

        return String.format(
                "**Tiểu sử Nghệ sĩ: %s**\n\n" +
                "%s là một trong những nghệ sĩ nổi bật và có tầm ảnh hưởng lớn nhất trong dòng nhạc hiện đại ngày nay. " +
                "Với phong cách trình diễn lôi cuốn, tư duy âm nhạc sáng tạo và khả năng kết nối khán giả tuyệt vời, " +
                "nghệ sĩ đã liên tục gặt hái được nhiều giải thưởng danh giá và sở hữu lượng người hâm mộ đông đảo trên khắp cả nước. " +
                "Đêm nhạc sắp tới hứa hẹn sẽ là một không gian nghệ thuật đỉnh cao, nơi %s cùng ban nhạc sẽ mang đến những bản phối mới " +
                "và những màn trình diễn tràn đầy cảm xúc đặc sắc dành riêng cho người hâm mộ TicketBox.",
                artistName, artistName, artistName
        );
    }

    // Jackson serialization classes
    public record GeminiRequest(List<Content> contents) {
        public record Content(List<Part> parts) {}
        public record Part(String text) {}
    }

    public record GeminiResponse(List<Candidate> candidates) {
        public record Candidate(Content content) {}
        public record Content(List<Part> parts) {}
        public record Part(String text) {}
    }
}
