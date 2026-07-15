import http from 'k6/http';
import { sleep, check } from 'k6';
import { vu } from 'k6/execution';
import { SharedArray } from 'k6/data';

// Tải trước 10,000 token từ file JSON đã chuẩn bị
const tokens = new SharedArray('user tokens', function () {
  return JSON.parse(open('./tokens.json'));
});

// CẤU HÌNH EXECUTOR CHỈ CHẠY ĐÚNG 1 LẦN CHO MỖI USER (10,000 VUs)
export const options = {
  scenarios: {
    single_user_flow: {
      executor: 'per-vu-iterations',
      vus: __ENV.VUS ? parseInt(__ENV.VUS, 10) : 20000,
      iterations: 1,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],     // Tỷ lệ lỗi dưới 5%
    http_req_duration: ['p(95)<3000'],  // 95% phản hồi dưới 3s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const CONCERT_ID = __ENV.CONCERT_ID || '10000000-0000-0000-0000-000000000001';
const TICKET_TYPE_ID = __ENV.TICKET_TYPE_ID || '20000000-0000-0000-0000-000000000001';

// Lấy Headers chứa Token đã pre-auth cho VU hiện tại
function getAuthHeaders(vuId) {
  const token = tokens[vuId - 1];
  if (!token) {
    return null;
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export default function () {
  const vuId = vu.idInTest;
  const headers = getAuthHeaders(vuId);
  if (!headers) return;

  // 1. Phân bổ thời gian khởi động (Stagger startup): ngẫu nhiên từ 0 đến 60 giây
  // để tránh việc 10,000 user ùa vào cùng một mili-giây gây nghẽn socket máy local
  const startDelay = Math.random() * 60;
  sleep(startDelay);

  // 2. Gọi API GET Concert đúng 2 lần (mỗi lần cách nhau 2 giây) -> Tổng cộng 20,000 requests
  let res1 = http.get(`${BASE_URL}/api/concerts/${CONCERT_ID}`, { headers });
  check(res1, { 'view concert 1 success': (r) => r.status === 200 });
  sleep(2);

  let res2 = http.get(`${BASE_URL}/api/concerts/${CONCERT_ID}`, { headers });
  check(res2, { 'view concert 2 success': (r) => r.status === 200 });
  sleep(1);

  // 3. Gọi API tham gia Hàng đợi đúng 1 lần -> Tổng cộng 10,000 requests
  let joinRes = http.post(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/join`, null, { headers });
  check(joinRes, { 'join queue success': (r) => r.status === 200 });

  // 4. Polling trạng thái hàng đợi cho đến khi được DUYỆT (ADMITTED) hoặc hết giờ
  let admitted = false;
  let queueToken = '';
  let retryCount = 0;

  while (!admitted && retryCount < 20) {
    sleep(3);
    let statusRes = http.get(`${BASE_URL}/api/queue/concerts/${CONCERT_ID}/status`, { headers });
    
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

  // 5. Nếu được duyệt vào phòng mua vé thành công
  if (admitted && queueToken) {
    const idempotencyKey = `idemp-${vuId}-${Date.now()}`;
    const orderPayload = JSON.stringify({
      concertId: CONCERT_ID,
      items: [{ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }]
    });

    const orderHeaders = Object.assign({}, headers, {
      'Queue-Access-Token': queueToken,
      'Idempotency-Key': idempotencyKey,
    });

    // Gọi API Tạo Đơn hàng (Mua vé) đúng 1 lần
    let orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, { headers: orderHeaders });
    const orderCreated = check(orderRes, {
      'order response processed (201/409/429)': (r) => r.status === 201 || r.status === 409 || r.status === 429
    });

    // 6. Nếu đặt vé thành công (201), tiến hành Thanh toán
    if (orderCreated && orderRes.status === 201) {
      const orderId = orderRes.json('data.id');
      
      // Gọi API Khởi tạo thanh toán (Initiate Payment)
      const payPayload = JSON.stringify({ provider: 'MOCK' });
      let payInitRes = http.post(`${BASE_URL}/api/payments/${orderId}/initiate`, payPayload, { headers });
      const payInitiated = check(payInitRes, {
        'payment initiated success': (r) => r.status === 200
      });

      if (payInitiated) {
        sleep(1.5); // Mô phỏng user xử lý trên ứng dụng thanh toán
        
        // Gọi API Thanh toán thành công giả lập (Mock Payment Success)
        let payConfirmRes = http.post(`${BASE_URL}/api/mock-payments/${orderId}/success`, null, { headers });
        check(payConfirmRes, {
          'payment mock success processed': (r) => r.status === 200
        });
      }
    }
  }
}
