import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { RemoteImage } from '../../components/RemoteImage';
import { eventDate, events } from '../../data/mockData';
import type { CheckoutEvent } from './CheckoutPage';

export function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const failed = searchParams.get('status') === 'failed';
  const stateEvent = (location.state as { event?: CheckoutEvent } | null)?.event;
  const mockEvent = events[0];
  const event: CheckoutEvent = stateEvent ?? {
    id: mockEvent.id,
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
        <p>We could not complete the payment. No charge was made. Try again or choose another payment method.</p>
        <div className="confirmation-actions">
          <Link className="button button-primary" to="/checkout" state={{ event }}>Try payment again</Link>
          <Link className="button button-secondary" to="/">Return home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="confirmation-page page-width" aria-live="polite">
      <div className="confirmation-mark">✓</div>
      <p className="eyebrow"><span /> Booking confirmed</p>
      <h1>You’re going to <em>{event.title}.</em></h1>
      <p>Your tickets are ready. We also sent a confirmation to minhquan@example.com.</p>
      <div className="confirmation-ticket">
        <RemoteImage src={event.image ?? undefined} alt="" width="360" height="240" />
        <div>
          <span>Order TBX-826401</span>
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
