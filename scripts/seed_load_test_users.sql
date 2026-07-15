-- Script seed 80,000 test users phục vụ kiểm thử hiệu năng (Load Testing)
-- Sử dụng hàm generate_series của PostgreSQL để sinh dữ liệu cực nhanh mà không bị nghẽn BCrypt CPU.
-- Tất cả các tài khoản có mật khẩu mặc định là: password123

INSERT INTO users (id, email, phone, full_name, password_hash, role, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid() AS id,
    'loaduser_' || i || '@ticketbox.test' AS email,
    '09' || lpad(i::text, 8, '0') AS phone,
    'Load User ' || i AS full_name,
    '$2a$10$Jq3HmuxZRFzkG5jlPyIr3eq86cSyIsE9isHdSLWc9X95ztLI6w7aG' AS password_hash, -- BCrypt hash của 'password123'
    'AUDIENCE' AS role,
    TRUE AS is_active,
    NOW() AS created_at,
    NOW() AS updated_at
FROM generate_series(1, 80000) i
ON CONFLICT (email) DO NOTHING;
