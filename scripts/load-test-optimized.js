import http from 'k6/http';
import { sleep, check } from 'k6';
import { vu } from 'k6/execution';

// CẤU HÌNH TẢI TỐI ƯU HÓA (REUSE TOKEN)
export const options = {
  scenarios: {
    optimized_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 2000 }, // Ramping nhanh lên 2,000 VUs
        { duration: '3m', target: 5000 }, // Giữ mức tải cao 5,000 VUs để test giới hạn thực tế
        { duration: '1m', target: 0 },    // Hạ tải
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],     // Tỷ lệ lỗi dưới 5%
    http_req_duration: ['p(95)<2000'],  // 95% phản hồi dưới 2s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CONCERT_ID = __ENV.CONCERT_ID || '10000000-0000-0000-0000-000000000001';
const TICKET_TYPE_ID = __ENV.TICKET_TYPE_ID || '20000000-0000-0000-0000-000000000001';

// KHAI BÁO BIẾN TOÀN CỤC CHO MỖI VU ĐỂ CACHE TOKEN
let cachedToken = '';
let cachedHeaders = null;

export default function () {
  // Lấy ID duy nhất của Virtual User (VUs) đang chạy từ 1 đến N
  const vuId = vu.idInTest;
  const email = `loaduser_${vuId}@ticketbox.test`;
  const password = 'password123';

  // --- BƯỚC 1: ĐĂNG NHẬP (Chỉ chạy 1 LẦN DUY NHẤT khi VU bắt đầu vòng lặp đầu tiên) ---
  if (!cachedToken) {
    const loginPayload = JSON.stringify({ email: email, password: password });
    const loginHeaders = { 'Content-Type': 'application/json' };
    
    let loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers: loginHeaders });
    
    if (!check(loginRes, { 'login success': (r) => r.status === 200 })) {
      console.warn(`[LOGIN FAILED] ${email} - status: ${loginRes.status}`);
      return;
    }
    
    // Lưu lại Token để dùng cho tất cả các vòng lặp sau của chính VU này
    cachedToken = loginRes.json('data.accessToken');
    cachedHeaders = {
      'Authorization': `Bearer ${cachedToken}`,
      'Content-Type': 'application/json'
    };
  }

  // --- BƯỚC 2: XEM CHI TIẾT CONCERT ---
  let concertRes = http.get(`${BASE_URL}/api/concerts/${CONCERT_ID}`, { headers: cachedHeaders });
  check(concertRes, { 'view concert detail success': (r) => r.status === 200 });
  sleep(1);

  // --- BƯỚC 3: GỬI YÊU CẦU THAM GIA PHÒNG CHỜ (JOIN QUEUE) ---
  let joinRes = http.post(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/join`, null, { headers: cachedHeaders });
  check(joinRes, { 'join queue success': (r) => r.status === 200 });

  let admitted = false;
  let queueToken = '';
  let retryCount = 0;

  // --- BƯỚC 4: POLLING TRẠNG THÁI HÀNG ĐỢI ---
  while (!admitted && retryCount < 10) {
    sleep(3);
    let statusRes = http.get(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/status`, { headers: cachedHeaders });
    
    if (statusRes.status === 200) {
      const statusData = statusRes.json('data');
      if (statusData && statusData.status === 'ADMITTED') {
        admitted = true;
        queueToken = statusData.queueAccessToken;
        break;
      }
    }
    retryCount++;
  }

  // --- BƯỚC 5: GIAO DỊCH ĐẶT VÉ (RESERVE TICKET) ---
  if (admitted && queueToken) {
    const idempotencyKey = `idemp-${vuId}-${Date.now()}`;
    const orderPayload = JSON.stringify({
      concertId: CONCERT_ID,
      items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }]
    });

    const orderHeaders = Object.assign({}, cachedHeaders, {
      'Queue-Access-Token': queueToken,
      'Idempotency-Key': idempotencyKey,
    });

    let orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, { headers: orderHeaders });
    check(orderRes, {
      'order response processed': (r) => r.status === 201 || r.status === 409 || r.status === 400 || r.status === 429
    });
  }
}
