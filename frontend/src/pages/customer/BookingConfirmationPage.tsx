import { Link, useLocation, useSearchParams } from 'react-router-dom';
import type { Order } from '../../api/orders';
import { RemoteImage } from '../../components/RemoteImage';
import { eventDate, events } from '../../data/mockData';
import type { CheckoutState } from './CheckoutPage';

type ConfirmationState = Partial<CheckoutState> & {
  order?: Order;
};

export function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const failed = searchParams.get('status') === 'failed';
  const state = location.state as ConfirmationState | null;
  const mockEvent = events[0];
  const event = state?.event ?? {
    id: String(mockEvent.id),
    title: mockEvent.title,
    venue: mockEvent.venue,
    date: mockEvent.date,
    image: mockEvent.image,
  };

  if (failed) {
    return (
      <section className="confirmation-page page-width" aria-live="polite">
        <div className="confirmation-mark failed">!</div>
        <p className="eyebrow"><span /> Payment unsuccessful</p>
        <h1>Your tickets are still <em>waiting.</em></h1>
        <p>We could not complete the payment. No charge was made. Try again or check your order history.</p>
        <div className="confirmation-actions">
          {state?.selection?.length ? (
            <Link className="button button-primary" to="/checkout" state={{ event, selection: state.selection }}>
              Try payment again
            </Link>
          ) : null}
          <Link className="button button-secondary" to="/profile">View orders</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="confirmation-page page-width" aria-live="polite">
      <div className="confirmation-mark">✓</div>
      <p className="eyebrow"><span /> Booking confirmed</p>
      <h1>You’re going to <em>{event.title}.</em></h1>
      <p>Your payment is confirmed and your tickets are ready.</p>
      <div className="confirmation-ticket">
        <RemoteImage src={event.image ?? undefined} alt="" width="360" height="240" />
        <div>
          <span>{state?.order ? `Order ${state.order.id.slice(0, 8).toUpperCase()}` : 'Order confirmed'}</span>
          <h2>{event.title}</h2>
          <p>{eventDate.format(new Date(event.date))}</p>
          <p>{event.venue}</p>
        </div>
        <div className="mini-qr" aria-label="Decorative ticket QR preview"><i /><i /><i /></div>
      </div>
      <div className="confirmation-actions">
        <Link className="button button-primary" to="/my-tickets">View my tickets</Link>
        <Link className="button button-secondary" to="/">Discover more events</Link>
      </div>
    </section>
  );
}
