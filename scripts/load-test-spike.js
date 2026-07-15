import http from 'k6/http';
import { sleep, check } from 'k6';
import { scenario } from 'k6/execution';


// CẤU HÌNH TẢI TRỌNG K6 (LOAD PROFILE)
// Mô phỏng 80.000 người truy cập trong 5 phút.
// 70% dồn vào phút đầu tiên (56.000 users trong 60s -> ~933 users mới vào/giây)
// 30% rải đều 4 phút tiếp theo (24.000 users trong 240s -> ~100 users mới vào/giây)
export const options = {
  scenarios: {
    ticket_sale_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 2000,   // Số lượng Virtual Users khởi tạo sẵn để tránh trễ
      maxVUs: 20000,           // Số lượng Virtual Users tối đa được phép cấp phát
      stages: [
        // Phút thứ 1: Tải tăng vọt đạt tốc độ 933 lượt truy cập mới mỗi giây (Tương đương 56.000 users)
        { target: 933, duration: '1m' },
        // Phút 2 - 5: Tốc độ duy trì ổn định ở mức 100 lượt truy cập mới mỗi giây (Tương đương 24.000 users)
        { target: 100, duration: '4m' },
        // Hạ nhiệt tải về 0
        { target: 0, duration: '1m' },
      ],
    },
  },
  thresholds: {
    // Tiêu chí đánh giá hệ thống đạt chất lượng (SLA)
    http_req_failed: ['rate<0.02'],     // Tỷ lệ lỗi HTTP dưới 2%
    http_req_duration: ['p(95)<2000'],  // 95% request phản hồi dưới 2 giây
  },
};

// CÁC THAM SỐ CẤU HÌNH KIỂM THỬ
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CONCERT_ID = __ENV.CONCERT_ID || '10000000-0000-0000-0000-000000000001';
const TICKET_TYPE_ID = __ENV.TICKET_TYPE_ID || '20000000-0000-0000-0000-000000000001';


export default function () {
  // Giả định mỗi VU đại diện cho 1 User tương ứng với ID tuần tự.
  // Sử dụng dữ liệu email được seed sẵn: loaduser_1@ticketbox.test đến loaduser_80000@ticketbox.test
  // Lưu ý: Mật khẩu mặc định của các tài khoản này là 'password123'
  const userIndex = scenario.iterationInTest + 1; // Tuần tự duy nhất trên toàn bộ bài test
  const email = `loaduser_${userIndex}@ticketbox.test`;
  const password = 'password123';

  // --- BƯỚC 1: ĐĂNG NHẬP LẤY TOKEN JWT ---
  // Khuyên dùng: Để tối ưu CPU không bị nghẽn bởi mã hóa BCrypt, nên sinh sẵn danh sách token JWT
  // từ một script Node.js phụ và nạp vào k6 qua file JSON SharedArray.
  // Dưới đây là phương án chạy động (Dynamic Login) để test tải toàn diện:
  const loginPayload = JSON.stringify({ email: email, password: password });
  const loginHeaders = { 'Content-Type': 'application/json' };
  
  let loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers: loginHeaders });
  
  if (!check(loginRes, { 'login success': (r) => r.status === 200 })) {
    console.warn(`[LOGIN FAILED] ${email} - status: ${loginRes.status}, body: ${loginRes.body}`);
    return; // Đăng nhập thất bại -> hủy luồng chạy của user này
  }
  
  const token = loginRes.json('data.accessToken');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // --- BƯỚC 2: XEM CHI TIẾT CONCERT ---
  let concertRes = http.get(`${BASE_URL}/api/concerts/${CONCERT_ID}`, { headers: authHeaders });
  if (!check(concertRes, { 'view concert detail success': (r) => r.status === 200 })) {
    console.warn(`[CONCERT DETAIL FAILED] ${email} - status: ${concertRes.status}, body: ${concertRes.body}`);
  }
  sleep(1); // Giả lập user dừng 1 giây để đọc thông tin

  // --- BƯỚC 3: GỬI YÊU CẦU THAM GIA PHÒNG CHỜ (JOIN QUEUE) ---
  let joinRes = http.post(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/join`, null, { headers: authHeaders });
  if (!check(joinRes, { 'join queue success': (r) => r.status === 200 })) {
    console.warn(`[JOIN QUEUE FAILED] ${email} - status: ${joinRes.status}, body: ${joinRes.body}`);
  }

  let admitted = false;
  let queueToken = '';
  let retryCount = 0;

  // --- BƯỚC 4: POLLING TRẠNG THÁI HÀNG ĐỢI ---
  // User định kỳ check status hàng đợi mỗi 5 giây cho đến khi nhận được trạng thái ADMITTED
  // Giới hạn tối đa polling 24 lần (tương đương 2 phút) để tránh lặp vô hạn
  while (!admitted && retryCount < 24) {
    sleep(5);
    let statusRes = http.get(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/status`, { headers: authHeaders });
    
    if (statusRes.status === 200) {
      const statusData = statusRes.json('data');
      if (statusData && statusData.status === 'ADMITTED') {
        admitted = true;
        queueToken = statusData.queueAccessToken; // Token quyền truy cập mua vé
        break;
      }
    } else {
      console.warn(`[STATUS POLLING ERROR] ${email} - status: ${statusRes.status}, body: ${statusRes.body}`);
    }
    retryCount++;
  }

  // --- BƯỚC 5: GIAO DỊCH ĐẶT VÉ (RESERVE TICKET) ---
  if (admitted && queueToken) {
    // Sinh idempotency key duy nhất dựa trên ID người dùng để chống trùng lặp request
    const idempotencyKey = `idemp-${userIndex}-${Date.now()}`;
    const orderPayload = JSON.stringify({
      concertId: CONCERT_ID,
      items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }]
    });

    const orderHeaders = Object.assign({}, authHeaders, {
      'Queue-Access-Token': queueToken,
      'Idempotency-Key': idempotencyKey,
    });

    let orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, { headers: orderHeaders });
    
    if (!check(orderRes, {
      'order response processed': (r) => r.status === 201 || r.status === 409 || r.status === 400 || r.status === 429
    })) {
      console.warn(`[ORDER CREATE FAILED] ${email} - status: ${orderRes.status}, body: ${orderRes.body}`);
    }
  }

}
