import { Link, useParams } from 'react-router-dom';
import { EventCard } from '../../components/EventCard';
import { currency, eventDate, events, getEvent } from '../../data/mockData';

export function ConcertDetailPage() {
  const { id } = useParams();
  const event = getEvent(id);
  const isSoldOut = event.status === 'sold-out';

  return (
    <>
      <section className="detail-hero">
        <img src={event.image} alt="" width="1800" height="1000" fetchPriority="high" />
        <div className="detail-overlay" />
        <div className="detail-hero-content page-width">
          <Link className="back-link" to="/">← All events</Link>
          <div className="detail-title">
            <p className="eyebrow"><span /> {event.category} · {event.city}</p>
            <h1>{event.title}</h1>
            <p className="artist-line">{event.artist}</p>
          </div>
          <div className="detail-facts">
            <Fact label="Date" value={eventDate.format(new Date(event.date))} />
            <Fact label="Doors open" value={event.time} />
            <Fact label="Venue" value={event.venue} />
          </div>
        </div>
      </section>

      <section className="detail-body page-width">
        <article className="detail-story">
          <p className="eyebrow"><span /> About the night</p>
          <h2>A live experience shaped around <em>sound, light, and connection.</em></h2>
          <p>
            Step into a one-night world built for music lovers. A sweeping visual production,
            intimate storytelling, and the electric feeling of thousands of voices meeting in
            the same room.
          </p>
          <p>
            Every detail—from the opening atmosphere to the final encore—has been designed to
            make this more than a concert. Come early, stay curious, and let the night unfold.
          </p>
          <div className="feature-row">
            <Feature number="01" title="Immersive production" copy="A cinematic stage and spatial sound." />
            <Feature number="02" title="Curated hospitality" copy="Food, drinks, and thoughtful amenities." />
            <Feature number="03" title="Easy entry" copy="Mobile tickets and dedicated support." />
          </div>
        </article>

        <aside className="booking-card">
          <p className="booking-label">Tickets from</p>
          <p className="booking-price">{currency.format(event.price)}</p>
          <div className="booking-divider" />
          <div className="booking-detail"><span>Date</span><strong>{eventDate.format(new Date(event.date))}</strong></div>
          <div className="booking-detail"><span>Location</span><strong>{event.city}</strong></div>
          <div className="booking-detail"><span>Admission</span><strong>Mobile ticket</strong></div>
          {isSoldOut ? (
            <button className="button button-disabled" type="button" disabled>Sold out</button>
          ) : (
            <Link className="button button-primary button-block" to={`/concerts/${event.id}/seats`}>
              Choose tickets <span aria-hidden="true">→</span>
            </Link>
          )}
          <p className="secure-note">Secure checkout · Official ticket partner</p>
        </aside>
      </section>

      <section className="venue-section">
        <div className="page-width venue-grid">
          <div>
            <p className="eyebrow"><span /> The venue</p>
            <h2>{event.venue}</h2>
            <p>{event.city}, Vietnam</p>
            <a className="text-link" href="#map">View directions ↗</a>
          </div>
          <div className="map-art" id="map" aria-label={`Stylized map of ${event.venue}`}>
            <span className="map-pin">T</span>
            <i className="road road-one" />
            <i className="road road-two" />
            <i className="road road-three" />
          </div>
        </div>
      </section>

      <section className="more-events page-width">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Keep exploring</p><h2>You may also <em>love.</em></h2></div>
          <Link className="text-link" to="/">See all events →</Link>
        </div>
        <div className="event-grid event-grid-three">
          {events.filter((item) => item.id !== event.id).slice(0, 3).map((item) => (
            <EventCard event={item} key={item.id} />
          ))}
        </div>
      </section>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function Feature({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="detail-feature"><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>;
}
