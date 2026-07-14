# Đặc tả: AI Artist Bio (Tạo giới thiệu nghệ sĩ bằng AI)

> Khung tài liệu — điền nội dung vào các phần `<!-- ... -->`.
> Phục vụ yêu cầu: organizer upload PDF hồ sơ nghệ sĩ/press kit, hệ thống tách nội dung, làm sạch text, gọi AI tạo bio ngắn hiển thị trên trang chi tiết concert.

## 1. Mô tả
<!-- Ban tổ chức upload file PDF (hồ sơ nghệ sĩ / press kit). Hệ thống tự động xử lý:
     tách nội dung, làm sạch văn bản, gửi sang mô hình AI tạo bản giới thiệu ngắn gọn. -->

---

## 2. Luồng chính
<!-- - Endpoint upload PDF (organizer).
     - Pipeline: extract text từ PDF -> clean text -> gọi AI provider -> lưu bio.
     - Provider config: ARTIST_BIO_AI_PROVIDER, ARTIST_BIO_AI_API_KEY; fallback mock khi không có key.
     - Xử lý bất đồng bộ (async/queue) hay đồng bộ?
     - Thành phần: Upload API, PDF parser, AI adapter, DB. -->

---

## 3. Kịch bản lỗi
<!-- - PDF hỏng / không đọc được text -> báo lỗi, không tạo bio.
     - AI provider timeout/lỗi -> retry hay fallback mock? (liên quan circuit breaker artistBioAi).
     - File quá lớn -> giới hạn kích thước. -->

---

## 4. Ràng buộc
<!-- - Giới hạn kích thước/định dạng file upload.
     - Bảo vệ API key (không commit).
     - Circuit breaker cho AI provider (instance artistBioAi trong application.yml). -->

---

## 5. Tiêu chí chấp nhận
<!-- 1. Upload PDF hợp lệ -> sinh được bio hiển thị trên trang chi tiết concert.
     2. Khi AI lỗi/không có key -> fallback mock hoạt động, không crash.
     3. File lỗi được từ chối với thông báo rõ ràng. -->
