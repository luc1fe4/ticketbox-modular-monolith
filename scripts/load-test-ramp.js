import http from 'k6/http';
import { sleep, check } from 'k6';
import { scenario } from 'k6/execution';

// CẤU HÌNH TĂNG DẦN TẢI TRỌNG (STAIRCASE LOAD PROFILE)
export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },  // Phút 1: Tăng lên 100 VUs
        { duration: '1m', target: 100 },  // Phút 2: Giữ ở 100 VUs
        { duration: '2m', target: 500 },  // Phút 3-4: Ramping lên 500 VUs
        { duration: '1m', target: 500 },  // Phút 5: Giữ ở 500 VUs
        { duration: '2m', target: 1000 }, // Phút 6-7: Ramping lên 1000 VUs (Mốc giới hạn local)
        { duration: '1m', target: 1000 }, // Phút 8: Giữ ở 1000 VUs
        { duration: '1m', target: 0 },    // Phút 9: Hạ tải về 0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],     // Cho phép tỷ lệ lỗi tối đa 5% khi bị stress test cực đại
    http_req_duration: ['p(95)<2000'],  // 95% request phản hồi dưới 2 giây
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CONCERT_ID = __ENV.CONCERT_ID || '10000000-0000-0000-0000-000000000001';
const TICKET_TYPE_ID = __ENV.TICKET_TYPE_ID || '20000000-0000-0000-0000-000000000001';

export default function () {
  const userIndex = scenario.iterationInTest + 1;
  const email = `loaduser_${userIndex}@ticketbox.test`;
  const password = 'password123';

  // --- BƯỚC 1: ĐĂNG NHẬP ---
  const loginPayload = JSON.stringify({ email: email, password: password });
  const loginHeaders = { 'Content-Type': 'application/json' };
  
  let loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers: loginHeaders });
  
  if (!check(loginRes, { 'login success': (r) => r.status === 200 })) {
    console.warn(`[LOGIN FAILED] ${email} - status: ${loginRes.status}, body: ${loginRes.body}`);
    return;
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
  sleep(1);

  // --- BƯỚC 3: GỬI YÊU CẦU THAM GIA PHÒNG CHỜ (JOIN QUEUE) ---
  let joinRes = http.post(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/join`, null, { headers: authHeaders });
  if (!check(joinRes, { 'join queue success': (r) => r.status === 200 })) {
    console.warn(`[JOIN QUEUE FAILED] ${email} - status: ${joinRes.status}, body: ${joinRes.body}`);
  }

  let admitted = false;
  let queueToken = '';
  let retryCount = 0;

  // --- BƯỚC 4: POLLING TRẠNG THÁI HÀNG ĐỢI ---
  while (!admitted && retryCount < 24) {
    sleep(5);
    let statusRes = http.get(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/status`, { headers: authHeaders });
    
    if (statusRes.status === 200) {
      const statusData = statusRes.json('data');
      if (statusData && statusData.status === 'ADMITTED') {
        admitted = true;
        queueToken = statusData.queueAccessToken;
        break;
      }
    } else {
      console.warn(`[STATUS POLLING ERROR] ${email} - status: ${statusRes.status}, body: ${statusRes.body}`);
    }
    retryCount++;
  }

  // --- BƯỚC 5: GIAO DỊCH ĐẶT VÉ (RESERVE TICKET) ---
  if (admitted && queueToken) {
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
