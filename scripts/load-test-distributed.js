import http from 'k6/http';
import { sleep, check } from 'k6';
import { vu } from 'k6/execution';

// CẤU HÌNH PHÂN BỔ ĐA KỊCH BẢN (8,000 VUs)
export const options = {
  scenarios: {
    // KỊCH BẢN 1: 1,600 VUs chỉ xem thông tin Concert (20%)
    browse_users: {
      executor: 'ramping-vus',
      exec: 'browseHandler',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1600 },
        { duration: '3m', target: 1600 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // KỊCH BẢN 2: 4,000 VUs xếp hàng đợi nhưng không mua (50%)
    queue_users: {
      executor: 'ramping-vus',
      exec: 'queueHandler',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 4000 },
        { duration: '3m', target: 4000 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // KỊCH BẢN 3: 2,400 VUs thực hiện đặt mua vé đầy đủ (30%)
    purchase_users: {
      executor: 'ramping-vus',
      exec: 'purchaseHandler',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 2400 },
        { duration: '3m', target: 2400 },
        { duration: '1m', target: 0 },
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

// HÀM HELPER ĐỂ ĐĂNG NHẬP VÀ CACHE TOKEN CHO TỪNG VU
function getAuthHeaders(vuId) {
  const email = `loaduser_${vuId}@ticketbox.test`;
  const password = 'password123';
  
  const loginPayload = JSON.stringify({ email: email, password: password });
  const loginHeaders = { 'Content-Type': 'application/json' };
  
  let loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers: loginHeaders });
  
  if (loginRes.status === 200) {
    const token = loginRes.json('data.accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  return null;
}

// Biến lưu cache headers cho từng thread của VU
let cachedHeaders = null;

// ==========================================
// 1. HANDLER CHO NHÓM CHỈ XEM CHI TIẾT CONCERT
// ==========================================
export function browseHandler() {
  const vuId = vu.idInTest;
  if (!cachedHeaders) {
    cachedHeaders = getAuthHeaders(vuId);
    if (!cachedHeaders) return;
  }

  let concertRes = http.get(`${BASE_URL}/api/concerts/${CONCERT_ID}`, { headers: cachedHeaders });
  check(concertRes, { 'browse - view concert success': (r) => r.status === 200 });
  sleep(2);
}

// ==========================================
// 2. HANDLER CHO NHÓM XẾP HÀNG ĐỢI (QUEUE)
// ==========================================
export function queueHandler() {
  const vuId = vu.idInTest;
  if (!cachedHeaders) {
    cachedHeaders = getAuthHeaders(vuId);
    if (!cachedHeaders) return;

    // Vào queue 1 lần duy nhất
    let joinRes = http.post(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/join`, null, { headers: cachedHeaders });
    check(joinRes, { 'queue - join queue success': (r) => r.status === 200 });
  }

  // Polling trạng thái hàng đợi liên tục
  let statusRes = http.get(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/status`, { headers: cachedHeaders });
  check(statusRes, { 'queue - check status success': (r) => r.status === 200 });
  sleep(3);
}

// ==========================================
// 3. HANDLER CHO NHÓM ĐẦY ĐỦ QUY TRÌNH MUA VÉ
// ==========================================
export function purchaseHandler() {
  const vuId = vu.idInTest;
  if (!cachedHeaders) {
    cachedHeaders = getAuthHeaders(vuId);
    if (!cachedHeaders) return;
  }

  // --- BƯỚC 1: XEM CHI TIẾT CONCERT ---
  let concertRes = http.get(`${BASE_URL}/api/concerts/${CONCERT_ID}`, { headers: cachedHeaders });
  check(concertRes, { 'purchase - view concert success': (r) => r.status === 200 });
  sleep(1);

  // --- BƯỚC 2: GỬI YÊU CẦU THAM GIA PHÒNG CHỜ (JOIN QUEUE) ---
  let joinRes = http.post(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/join`, null, { headers: cachedHeaders });
  check(joinRes, { 'purchase - join queue success': (r) => r.status === 200 });

  let admitted = false;
  let queueToken = '';
  let retryCount = 0;

  // --- BƯỚC 3: POLLING TRẠNG THÁI HÀNG ĐỢI ---
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

  // --- BƯỚC 4: GIAO DỊCH ĐẶT VÉ (RESERVE TICKET) ---
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
      'purchase - order response processed': (r) => r.status === 201 || r.status === 409 || r.status === 400 || r.status === 429
    });
  }
}
