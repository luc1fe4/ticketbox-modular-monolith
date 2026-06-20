import { Link } from 'react-router-dom';
import { currency, eventDate, type EventItem } from '../data/mockData';

export function EventCard({ event, priority = false }: { event: EventItem; priority?: boolean }) {
  return (
    <article className="event-card">
      <Link to={`/concerts/${event.id}`} aria-label={`View ${event.title}`}>
        <div className="event-image-wrap">
          <img
            src={event.image}
            alt=""
            width="720"
            height="900"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
          <span className={`status-pill status-${event.status}`}>
            {event.status === 'sold-out'
              ? 'Sold out'
              : event.status === 'selling-fast'
                ? 'Selling fast'
                : event.category}
          </span>
          <span className="card-arrow" aria-hidden="true">
            ↗
          </span>
        </div>
        <div className="event-card-copy">
          <p className="event-date">{eventDate.format(new Date(event.date))} · {event.time}</p>
          <h3>{event.title}</h3>
          <p>{event.venue} · {event.city}</p>
          <div className="event-price">
            <span>From</span>
            <strong>{currency.format(event.price)}</strong>
          </div>
        </div>
      </Link>
    </article>
  );
}
