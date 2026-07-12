package com.ticketbox.module.ai.infrastructure;

import com.ticketbox.module.ai.application.ArtistBioGenerationRequest;
import com.ticketbox.module.ai.application.ArtistBioGenerationResult;
import com.ticketbox.module.ai.application.ArtistBioGenerator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
        String artist = firstMatch(request.sourceText(),
                "(?im)^\\s*([\\p{L}][\\p{L} .'-]{1,60}?)\\s+là\\s+nghệ sĩ");
        if (artist == null) {
            artist = firstMatch(request.sourceText(),
                "(?is)(?:nghệ danh|artist name|nghệ sĩ)\\s*[:\\-]?\\s*([^\\n•]{2,60}?)(?=\\s+(?:hoạt động|thị trường|ngôn ngữ|định dạng)|[\\n•]|$)");
        }
        String genre = firstMatch(request.sourceText(),
                "(?is)(?:thể loại|genre)\\s*[:\\-]?\\s*([^\\n]{2,90})");
        if (artist == null) {
            artist = "Nghệ sĩ biểu diễn";
        }
        String genreSentence = genre == null
                ? "Hồ sơ cung cấp thông tin về phong cách biểu diễn và hành trình sáng tạo của nghệ sĩ."
                : "Nghệ sĩ theo đuổi màu sắc " + genre + ".";
        String bio = ("%s là nghệ sĩ được giới thiệu trong hồ sơ của concert %s. %s "
                + "Bản nháp này được tạo từ tài liệu đã tải lên; hãy biên tập và xác nhận trước khi xuất bản.")
                .formatted(artist, request.concertTitle(), genreSentence);
        return new ArtistBioGenerationResult(bio, provider(), model());
    }

    private String firstMatch(String text, String expression) {
        Matcher matcher = Pattern.compile(expression, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE)
                .matcher(text == null ? "" : text);
        if (!matcher.find()) {
            return null;
        }
        String value = matcher.group(1).replaceAll("\\s+", " ").trim();
        return value.isBlank() ? null : value;
    }
}
