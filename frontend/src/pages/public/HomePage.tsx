import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EventCard } from '../../components/EventCard';
import { events } from '../../data/mockData';

const categories = ['All', 'Live Music', 'Festival', 'Electronic', 'Indie', 'Acoustic', 'Pop'];

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [city, setCity] = useState('All cities');
  const category = searchParams.get('category') ?? 'All';
  const previewState = searchParams.get('state');
  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          (category === 'All' || event.category === category) &&
          (city === 'All cities' || event.city === city),
      ),
    [category, city],
  );

  function chooseCategory(nextCategory: string) {
    const next = new URLSearchParams(searchParams);
    if (nextCategory === 'All') next.delete('category');
    else next.set('category', nextCategory);
    next.delete('state');
    setSearchParams(next);
  }

  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src={events[0].image}
          alt=""
          width="1800"
          height="1000"
          fetchPriority="high"
        />
        <div className="hero-scrim" />
        <div className="hero-content page-width">
          <p className="eyebrow"><span /> Featured this week</p>
          <h1>Feel it live.<br /><em>Remember it forever.</em></h1>
          <p className="hero-copy">
            Find the nights you will talk about for years—live music, festivals, and culture
            across Vietnam.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/concerts/1">
              Explore the headline show <span aria-hidden="true">↗</span>
            </Link>
            <a className="text-link" href="#events">
              Browse all events <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <div className="hero-meta page-width">
          <span>01</span>
          <div><i /><i /><i /></div>
          <span>03</span>
        </div>
      </section>

      <section className="event-section page-width" id="events">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> Curated for you</p>
            <h2>Find your next <em>live moment.</em></h2>
          </div>
          <label className="city-select">
            <span>Location</span>
            <select value={city} onChange={(event) => setCity(event.target.value)}>
              <option>All cities</option>
              <option>Ho Chi Minh City</option>
              <option>Hanoi</option>
              <option>Da Nang</option>
            </select>
          </label>
        </div>

        <div className="category-row" aria-label="Event categories">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? 'active' : ''}
              aria-pressed={category === item}
              onClick={() => chooseCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {previewState === 'loading' ? <LoadingGrid /> : null}
        {previewState === 'error' ? (
          <StatePanel
            icon="!"
            title="The stage lights flickered."
            copy="We could not load events. Check your connection and try again."
            action="Try again"
            onAction={() => setSearchParams({})}
          />
        ) : null}
        {previewState !== 'loading' && previewState !== 'error' && filteredEvents.length > 0 ? (
          <div className="event-grid">
            {filteredEvents.map((event, index) => (
              <EventCard key={event.id} event={event} priority={index < 2} />
            ))}
          </div>
        ) : null}
        {previewState !== 'loading' && previewState !== 'error' && filteredEvents.length === 0 ? (
          <StatePanel
            icon="⌕"
            title="No events here—yet."
            copy="Try another city or explore all upcoming events."
            action="Show all events"
            onAction={() => setCity('All cities')}
          />
        ) : null}
      </section>

      <section className="manifesto">
        <div className="page-width manifesto-inner">
          <p>TicketBox Selects</p>
          <blockquote>“The best memories begin before the first note.”</blockquote>
          <div className="manifesto-stat">
            <strong>180+</strong>
            <span>original events<br />every season</span>
          </div>
        </div>
      </section>
    </>
  );
}

function LoadingGrid() {
  return (
    <div className="event-grid" aria-label="Loading events" aria-live="polite">
      {[1, 2, 3].map((item) => (
        <div className="event-skeleton" key={item}>
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function StatePanel({
  icon,
  title,
  copy,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  copy: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="state-panel">
      <span className="state-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
      <button className="button button-secondary" type="button" onClick={onAction}>{action}</button>
    </div>
  );
}
