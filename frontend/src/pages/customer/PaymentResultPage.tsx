import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrder, type Order } from '../../api/orders';
import { isRequestCanceled } from '../../api/client';
import { PENDING_PAYMENT_STORAGE_KEY, type CheckoutState } from './CheckoutPage';

type PendingPayment = CheckoutState & { orderId: string };

function readPendingPayment(): PendingPayment | null {
  try {
    const value = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
    return value ? (JSON.parse(value) as PendingPayment) : null;
  } catch {
    return null;
  }
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Đang xác nhận thanh toán của bạn với TicketBox...');
  const [pendingPayment] = useState(readPendingPayment);
  const orderId =
    searchParams.get('orderId') ?? searchParams.get('vnp_TxnRef') ?? pendingPayment?.orderId;
  const isVnpayFailure =
    searchParams.has('vnp_ResponseCode') && searchParams.get('vnp_ResponseCode') !== '00';
  const isMomoFailure = searchParams.has('resultCode') && searchParams.get('resultCode') !== '0';
  const providerReportedFailure = isVnpayFailure || isMomoFailure;

  useEffect(() => {
    if (!orderId || !pendingPayment) return;
    const activeOrderId = orderId;
    if (providerReportedFailure) {
      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      navigate('/booking-confirmation?status=failed', {
        replace: true,
        state: { ...pendingPayment },
      });
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function confirmPayment() {
      for (let attempt = 0; attempt < 15 && active; attempt += 1) {
        try {
          const order = await getOrder(activeOrderId, controller.signal);
          if (!active) return;
          if (order.status === 'PAID') {
            finish(order, false);
            return;
          }
          if (['PAYMENT_FAILED', 'EXPIRED', 'CANCELLED'].includes(order.status)) {
            finish(order, true);
            return;
          }
          setMessage('Đã nhận thanh toán. Đang chờ xác nhận đơn hàng...');
          await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        } catch (requestError) {
          if (active && !isRequestCanceled(requestError)) {
            setMessage(
              'Chúng tôi chưa xác nhận được thanh toán. Bạn có thể kiểm tra lại đơn hàng một cách an toàn.',
            );
          }
          return;
        }
      }
      if (active) setMessage('Xác nhận đang lâu hơn dự kiến. Hãy kiểm tra đơn hàng sau ít phút.');
    }

    function finish(order: Order, failed: boolean) {
      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      navigate(`/booking-confirmation${failed ? '?status=failed' : ''}`, {
        replace: true,
        state: { ...pendingPayment, order },
      });
    }

    void confirmPayment();
    return () => {
      active = false;
      controller.abort();
    };
  }, [navigate, orderId, pendingPayment, providerReportedFailure]);

  if (!orderId || !pendingPayment) {
    return (
      <section className="confirmation-page page-width">
        <div className="confirmation-mark failed">!</div>
        <p className="eyebrow">
          <span /> Không có kết quả thanh toán
        </p>
        <h1>Không thể khớp thanh toán này với đơn hàng.</h1>
        <p>Mở lịch sử đơn hàng để kiểm tra trạng thái thanh toán mới nhất.</p>
        <Link className="button button-primary" to="/profile">
          Xem đơn hàng
        </Link>
      </section>
    );
  }

  return (
    <section className="confirmation-page page-width" aria-live="polite">
      <div className="payment-result-spinner" aria-hidden="true" />
      <p className="eyebrow">
        <span /> Đang xử lý thanh toán
      </p>
      <h1>Vui lòng chờ, chúng tôi đang xác nhận đơn hàng của bạn.</h1>
      <p>{message}</p>
      <Link className="text-link" to="/profile">
        Xem lịch sử đơn hàng
      </Link>
    </section>
  );
}
