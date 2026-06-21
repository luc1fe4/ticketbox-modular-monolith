import { Link } from 'react-router-dom';
import type { ConcertStatus } from '../api/concerts';
import { eventDate } from '../data/mockData';
import { RemoteImage } from './RemoteImage';

export type EventCardItem = {
  id: string | number;
  title: string;
  venue: string;
  eventDate: string;
  status: ConcertStatus | 'available' | 'selling-fast' | 'sold-out';
  image: string | null;
  supportingText?: string;
};

export function EventCard({
  event,
  priority = false,
}: {
  event: EventCardItem;
  priority?: boolean;
}) {
  const isSoldOut = event.status === 'SOLD_OUT' || event.status === 'sold-out';
  const isSellingFast = event.status === 'selling-fast';
  const date = new Date(event.eventDate);
  const time = new Intl.DateTimeFormat('en-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return (
    <article className="event-card">
      <Link to={`/concerts/${event.id}`} aria-label={`View ${event.title}`}>
        <div className="event-image-wrap">
          <RemoteImage
            src={event.image ?? undefined}
            alt=""
            width="720"
            height="900"
            loading={priority ? 'eager' : 'lazy'}
          />
          <span className={`status-pill ${isSoldOut ? 'status-sold-out' : isSellingFast ? 'status-selling-fast' : ''}`}>
            {isSoldOut ? 'Sold out' : isSellingFast ? 'Selling fast' : 'On sale'}
          </span>
          <span className="card-arrow" aria-hidden="true">↗</span>
        </div>
        <div className="event-card-copy">
          <p className="event-date">{eventDate.format(date)} · {time}</p>
          <h3>{event.title}</h3>
          <p>{event.venue}</p>
          <div className="event-price">
            <strong>{event.supportingText ?? 'View tickets'}</strong>
          </div>
        </div>
      </Link>
    </article>
  );
}
