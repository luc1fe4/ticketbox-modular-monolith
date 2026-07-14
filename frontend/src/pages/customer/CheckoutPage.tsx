import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiClientError } from '../../api/client';
import {
  cancelOrder,
  completeMockPayment,
  createOrder,
  getOrder,
  initiatePayment,
  type Order,
  type PaymentProvider,
} from '../../api/orders';
import { clearStoredQueueAdmission, getStoredQueueAdmission, leaveQueue } from '../../api/queue';
import { RemoteImage } from '../../components/RemoteImage';
import { useToast } from '../../components/feedback/toast-context';
import { currency } from '../../data/mockData';
import { useCountdown } from '../../hooks/useCountdown';
import type { CheckoutSelection } from './SeatSelectionPage';

export type CheckoutEvent = {
  id: string;
  title: string;
  venue: string;
  date: string;
  image: string | null;
};

export type CheckoutState = {
  event: CheckoutEvent;
  selection: CheckoutSelection[];
  queueAccessToken?: string;
  sessionExpiresAt?: string;
};

export const PENDING_PAYMENT_STORAGE_KEY = 'ticketbox.pending-payment';

const paymentOptions: Array<{
  value: PaymentProvider;
  title: string;
  copy: string;
  badge: string;
}> = [
  {
    value: 'MOCK',
    title: 'Thanh toán demo',
    copy: 'Hoàn tất thanh toán ngay trong môi trường phát triển local.',
    badge: 'DEMO',
  },
  {
    value: 'VNPAY',
    title: 'VNPAY',
    copy: 'Tiếp tục an toàn sang trang thanh toán sandbox của VNPAY.',
    badge: 'VNPAY',
  },
  {
    value: 'MOMO',
    title: 'MoMo',
    copy: 'Tiếp tục an toàn sang trang thanh toán sandbox của MoMo.',
    badge: 'MoMo',
  },
];

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const state = location.state as CheckoutState | null;
  const event = state?.event;
  const selection = state?.selection ?? [];
  const storedAdmission = event ? getStoredQueueAdmission(event.id) : null;
  const queueAccessToken = state?.queueAccessToken ?? storedAdmission?.queueAccessToken;
  const [provider, setProvider] = useState<PaymentProvider>('MOCK');
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  const creationStarted = useRef(false);
  const paymentWarningShown = useRef(false);
  const paymentExpiredShown = useRef(false);
  const paymentCountdown = useCountdown(createdOrder?.expiresAt, 180);
  const displayedTotal =
    createdOrder?.totalAmount ??
    selection.reduce((total, item) => total + item.price * item.quantity, 0);

  useEffect(() => {
    if (!event || !selection.length || creationStarted.current) return;

    if (!queueAccessToken) {
      clearStoredQueueAdmission();
      setError('Phiên mua vé đã hết hạn. Đang đưa bạn về phòng chờ.');
      window.setTimeout(
        () => navigate(`/concerts/${event.id}/waiting-room`, { replace: true }),
        900,
      );
      return;
    }

    let active = true;
    let timeoutId: number | undefined;
    creationStarted.current = true;

    timeoutId = window.setTimeout(() => {
      if (!active) return;
      setCreatingOrder(true);
      setError(null);

      createOrder(
        event.id,
        selection.map((item) => ({ ticketTypeId: item.id, quantity: item.quantity })),
        idempotencyKey.current,
        queueAccessToken,
      )
        .then((order) => {
          if (!active) return;
          setCreatedOrder(order);
          // The order is now holding the inventory, so its waiting-room slot is released for the next buyer.
          clearStoredQueueAdmission();
        })
        .catch((requestError: unknown) => {
          if (!active) return;
          creationStarted.current = false;

          if (
            requestError instanceof ApiClientError &&
            (requestError.status === 401 || requestError.status === 403)
          ) {
            clearStoredQueueAdmission();
            setError('Phiên mua vé đã hết hạn. Đang đưa bạn về phòng chờ.');
            window.setTimeout(
              () => navigate(`/concerts/${event.id}/waiting-room`, { replace: true }),
              900,
            );
            return;
          }

          if (requestError instanceof ApiClientError && requestError.status === 409) {
            setError(
              'Tình trạng vé đã thay đổi trước khi đơn hàng được tạo. Hãy quay lại chọn vé để xem tồn kho mới nhất.',
            );
            window.setTimeout(
              () => navigate(`/concerts/${event.id}/seats`, { replace: true }),
              1200,
            );
            return;
          }

          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Không thể tạo đơn hàng của bạn.',
          );
        })
        .finally(() => {
          if (active) setCreatingOrder(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      creationStarted.current = false;
    };
  }, [event, navigate, queueAccessToken, selection]);

  useEffect(() => {
    if (!paymentCountdown.isWarning || paymentCountdown.isExpired || paymentWarningShown.current)
      return;
    paymentWarningShown.current = true;
    toast.error('Còn dưới 3 phút để hoàn tất thanh toán.');
  }, [paymentCountdown.isExpired, paymentCountdown.isWarning, toast]);

  useEffect(() => {
    if (!paymentCountdown.isExpired || paymentExpiredShown.current) return;
    paymentExpiredShown.current = true;
    setProcessing(false);
    setError('Thời gian thanh toán đã hết. Vui lòng quay lại chọn vé và tạo đơn mới.');
    toast.error('Đã hết thời gian thanh toán.');
  }, [paymentCountdown.isExpired, toast]);

  if (!event || !selection.length) {
    return (
      <section className="checkout-missing page-width state-panel">
        <span className="state-icon" aria-hidden="true">
          !
        </span>
        <h1>Chưa chọn vé</h1>
        <p>Chọn khu vé và số lượng trước khi bắt đầu thanh toán.</p>
        <Link className="button button-primary" to="/">
          Duyệt concert
        </Link>
      </section>
    );
  }

  async function waitForPaidOrder(orderId: string): Promise<Order> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const order = await getOrder(orderId);
      if (order.status === 'PAID') return order;
      if (['EXPIRED', 'CANCELLED', 'PAYMENT_FAILED'].includes(order.status)) return order;
      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }
    return getOrder(orderId);
  }

  async function submitPayment(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);

    if (!createdOrder) {
      setError('Đơn hàng của bạn vẫn đang được chuẩn bị. Vui lòng đợi một chút.');
      return;
    }

    if (paymentCountdown.isExpired) {
      setError('Thời gian thanh toán đã hết. Vui lòng quay lại chọn vé và tạo đơn mới.');
      return;
    }

    setProcessing(true);

    try {
      const pendingPayment = { event, selection, orderId: createdOrder.id };
      sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(pendingPayment));

      const payment = await initiatePayment(createdOrder.id, provider);
      if (!payment.paymentUrl) {
        throw new Error('Cổng thanh toán không trả về URL thanh toán.');
      }

      if (provider === 'VNPAY' || provider === 'MOMO') {
        window.location.assign(payment.paymentUrl);
        return;
      }

      await completeMockPayment(payment.paymentUrl);
      const paidOrder = await waitForPaidOrder(createdOrder.id);
      sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);

      if (paidOrder.status !== 'PAID') {
        navigate('/booking-confirmation?status=failed', {
          state: { event, selection, order: paidOrder },
        });
        return;
      }

      navigate('/booking-confirmation', {
        state: { event, selection, order: paidOrder },
      });
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError && requestError.status === 409
          ? 'Thời gian thanh toán đã hết hoặc đơn hàng không còn thanh toán được. Hãy quay lại chọn vé và tạo đơn mới.'
          : requestError instanceof Error
            ? requestError.message
            : 'Không thể hoàn tất thanh toán của bạn.',
      );
      setProcessing(false);
    }
  }

  const paymentDisabled =
    processing || cancelling || creatingOrder || !createdOrder || paymentCountdown.isExpired;

  async function leaveCheckout() {
    if (!event) return;
    if (processing || cancelling || creatingOrder) return;
    if (
      createdOrder &&
      !window.confirm('Rời trang thanh toán? Đơn hàng này sẽ bị hủy và vé của bạn sẽ được trả lại.')
    )
      return;

    setCancelling(true);
    setError(null);
    try {
      if (createdOrder) await cancelOrder(createdOrder.id);
      try {
        await leaveQueue(event.id);
      } catch {
        // Queue session has a backend TTL fallback.
      }
      clearStoredQueueAdmission();
      navigate(`/concerts/${event.id}`, { replace: true });
    } catch {
      setError('Không thể rời trang thanh toán an toàn. Vui lòng thử lại.');
      setCancelling(false);
    }
  }

  return (
    <div className="checkout-page page-width">
      <div className="flow-topbar">
        <button
          className="back-link"
          type="button"
          disabled={processing || cancelling || creatingOrder}
          onClick={() => void leaveCheckout()}
        >
          {'<'} Chi tiết sự kiện
        </button>
        <div className="flow-steps" aria-label="Tiến trình đặt vé">
          <span>
            1 <i>Vé</i>
          </span>
          <b />
          <span className="active">
            2 <i>Thanh toán</i>
          </span>
          <b />
          <span>
            3 <i>Hoàn tất</i>
          </span>
        </div>
        <div
          className={`secure-label countdown-timer ${paymentCountdown.isExpired ? 'expired' : paymentCountdown.isWarning ? 'warning' : ''}`}
          role="status"
        >
          <span>Thời gian thanh toán</span>
          <strong>{createdOrder ? paymentCountdown.formatted : '--:--'}</strong>
        </div>
      </div>

      <div className="checkout-heading">
        <p className="eyebrow">
          <span /> Sắp hoàn tất
        </p>
        <h1>Hoàn tất đơn hàng.</h1>
        <p>
          Đơn hàng được tạo trước, sau đó bộ đếm thanh toán 15 phút bắt đầu theo thời hạn từ
          backend.
        </p>
      </div>

      {error ? (
        <div className="checkout-error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <form className="checkout-layout" onSubmit={submitPayment}>
        <div className="checkout-form">
          <section className="form-section">
            <div className="form-section-title">
              <span>01</span>
              <h2>Phương thức thanh toán</h2>
            </div>
            <div
              className={`payment-timer-card ${paymentCountdown.isExpired ? 'expired' : paymentCountdown.isWarning ? 'warning' : ''}`}
              role="status"
            >
              <span>Thời gian thanh toán</span>
              <strong>
                {createdOrder
                  ? paymentCountdown.formatted
                  : creatingOrder
                    ? 'Đang tạo đơn...'
                    : '--:--'}
              </strong>
              <p>
                {paymentCountdown.isExpired
                  ? 'Đơn hàng này không còn thanh toán được.'
                  : paymentCountdown.isWarning
                    ? 'Hãy hoàn tất thanh toán sớm trước khi đơn hàng hết hạn.'
                    : 'Bạn có 15 phút sau khi backend tạo đơn hàng.'}
              </p>
            </div>
            <div className="payment-options">
              {paymentOptions.map((option) => (
                <label
                  className={`payment-option ${provider === option.value ? 'selected' : ''}`}
                  key={option.value}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={option.value}
                    checked={provider === option.value}
                    onChange={() => setProvider(option.value)}
                    disabled={paymentDisabled}
                  />
                  <span className={`payment-logo payment-${option.value.toLowerCase()}`}>
                    {option.badge}
                  </span>
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.copy}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="payment-explainer">
              TicketBox tạo đơn chờ thanh toán trước. Backend xác nhận tồn kho và tổng tiền cuối
              cùng trước khi mở nhà cung cấp thanh toán đã chọn.
            </p>
          </section>
        </div>

        <aside className="order-summary">
          <div className="order-event">
            <RemoteImage src={event.image ?? undefined} alt="" width="240" height="180" />
            <div>
              <span>Sự kiện của bạn</span>
              <h2>{event.title}</h2>
              <p>{event.venue}</p>
            </div>
          </div>
          <div className="summary-lines">
            {selection.map((item) => (
              <div key={item.id}>
                <span>
                  {item.quantity} x {item.name}
                </span>
                <strong>{currency.format(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div
            className={`hold-timer ${paymentCountdown.isExpired ? 'expired' : paymentCountdown.isWarning ? 'warning' : ''}`}
            role="status"
          >
            <span>Thời gian thanh toán</span>
            <strong>{createdOrder ? paymentCountdown.formatted : '--:--'}</strong>
          </div>
          <div className="summary-total">
            <span>Tổng tạm tính</span>
            <strong>{currency.format(displayedTotal)}</strong>
          </div>
          <button
            className="button button-primary button-block"
            type="submit"
            disabled={paymentDisabled}
          >
            {creatingOrder
              ? 'Đang tạo đơn...'
              : processing
                ? provider === 'MOCK'
                  ? 'Đang hoàn tất thanh toán...'
                  : `Đang mở ${provider}...`
                : paymentCountdown.isExpired
                  ? 'Đã hết thời gian thanh toán'
                  : `Tiếp tục với ${provider === 'MOCK' ? 'thanh toán demo' : provider}`}
          </button>
          <p className="secure-note">Backend tính tổng tiền chính xác và thời hạn thanh toán.</p>
        </aside>
      </form>
    </div>
  );
}
