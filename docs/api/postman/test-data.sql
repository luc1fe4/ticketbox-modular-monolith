-- ============================================================
-- TEST DATA for Concert Public API
-- Run this in your PostgreSQL database to have sample concerts
-- ============================================================

-- Step 1: Create a test organizer user (needed because concerts.created_by references users)
INSERT INTO users (id, email, full_name, password_hash, role)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'organizer@ticketbox.vn',
    'Nguyễn Văn Organizer',
    '$2a$10$dummyHashForTestingOnly1234567890abcdefghij',
    'ORGANIZER'
) ON CONFLICT (email) DO NOTHING;

-- Step 2: Insert sample concerts

-- Concert 1: ON_SALE (will appear in list)
INSERT INTO concerts (id, title, description, artist_bio, venue_name, venue_address, event_date, doors_open_at, status, poster_url, created_by)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Anh Trai Say Hi Live 2026',
    'Đêm nhạc hội lớn nhất mùa hè 2026 với sự tham gia của 12 Anh Trai tài năng.',
    'Anh Trai Say Hi là nhóm nhạc 12 thành viên được thành lập từ chương trình truyền hình thực tế cùng tên (2024). Nhóm gồm các nghệ sĩ nổi bật: HIEUTHUHAI, Đức Phúc, ERIK, Isaac, Quang Hùng MasterD và nhiều tài năng trẻ khác. Các ca khúc hit của nhóm bao gồm "Walk" (500 triệu views YouTube), "Catch Me If You Can" (#1 trending), và "Ngáo Ngơ". Nhóm đã thực hiện nhiều concert sold-out tại Việt Nam trong năm 2025.',
    'Sân vận động Quốc gia Mỹ Đình',
    'Đường Lê Đức Thọ, Phường Mỹ Đình 1, Quận Nam Từ Liêm, Hà Nội',
    '2026-08-15 19:00:00+07',
    '2026-08-15 17:00:00+07',
    'ON_SALE',
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
) ON CONFLICT (id) DO NOTHING;

-- Concert 2: ON_SALE (will appear in list)
INSERT INTO concerts (id, title, description, artist_bio, venue_name, venue_address, event_date, doors_open_at, status, poster_url, created_by)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Sơn Tùng M-TP: Sky Tour 2026',
    'Chuyến lưu diễn toàn quốc của Sơn Tùng M-TP với sân khấu hoành tráng nhất từ trước đến nay.',
    'Sơn Tùng M-TP (tên thật: Nguyễn Thanh Tùng, sinh ngày 5/7/1994) là nam ca sĩ, nhạc sĩ, rapper nổi tiếng nhất Việt Nam. Anh sở hữu hàng loạt hit như "Lạc Trôi", "Nơi Này Có Anh", "Hãy Trao Cho Anh" (ft. Snoop Dogg), và "Chúng Ta Của Hiện Tại". Với hơn 10 triệu subscribers trên YouTube, Sơn Tùng là nghệ sĩ Việt Nam có lượng fan đông đảo nhất.',
    'Nhà thi đấu Phú Thọ',
    '1 Lữ Gia, Phường 15, Quận 11, TP. Hồ Chí Minh',
    '2026-09-20 20:00:00+07',
    '2026-09-20 18:00:00+07',
    'ON_SALE',
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
) ON CONFLICT (id) DO NOTHING;

-- Concert 3: SOLD_OUT (will appear in list but marked as sold out)
INSERT INTO concerts (id, title, description, artist_bio, venue_name, venue_address, event_date, doors_open_at, status, poster_url, created_by)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Blackpink World Tour - Hà Nội',
    'Blackpink lần đầu tiên biểu diễn tại Việt Nam trong khuôn khổ Born Pink World Tour.',
    'BLACKPINK là nhóm nhạc nữ Hàn Quốc gồm 4 thành viên: Jisoo, Jennie, Rosé và Lisa, ra mắt năm 2016 dưới YG Entertainment. Nhóm nổi tiếng với các hit toàn cầu "DDU-DU DDU-DU", "How You Like That", "Pink Venom", và "Shut Down". BLACKPINK là nhóm nhạc nữ K-pop có lượng subscribers YouTube lớn nhất thế giới với hơn 90 triệu subscribers.',
    'Sân vận động Quốc gia Mỹ Đình',
    'Đường Lê Đức Thọ, Phường Mỹ Đình 1, Quận Nam Từ Liêm, Hà Nội',
    '2026-07-10 19:30:00+07',
    '2026-07-10 17:30:00+07',
    'SOLD_OUT',
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
) ON CONFLICT (id) DO NOTHING;

-- Concert 4: DRAFT (will NOT appear in public list)
INSERT INTO concerts (id, title, description, artist_bio, venue_name, venue_address, event_date, doors_open_at, status, poster_url, created_by)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Secret Concert - Coming Soon',
    'Sự kiện bí mật sẽ được công bố sau.',
    NULL,
    'TBA',
    'TBA',
    '2026-12-31 20:00:00+07',
    NULL,
    'DRAFT',
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- After running this, test with:
--   GET http://localhost:8080/api/concerts         → 3 concerts (no DRAFT)
--   GET http://localhost:8080/api/concerts/11111111-1111-1111-1111-111111111111 → Anh Trai detail
--   GET http://localhost:8080/api/concerts/44444444-4444-4444-4444-444444444444 → DRAFT concert (still visible by ID)
-- ============================================================
