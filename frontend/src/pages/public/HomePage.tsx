import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isRequestCanceled } from '../../api/client';
import { getConcerts, type ConcertSummary } from '../../api/concerts';
import { EventCard } from '../../components/EventCard';
import { fallbackConcertImage, RemoteImage } from '../../components/RemoteImage';

const statusFilters = ['All', 'On sale', 'Sold out'] as const;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [concerts, setConcerts] = useState<ConcertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const selectedStatus = searchParams.get('status') ?? 'All';

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    getConcerts(0, 12, controller.signal)
      .then((page) => {
        if (!active) return;
        setConcerts(page.content);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active && !isRequestCanceled(requestError)) {
          setError('We could not load concerts. Check that the backend is running and try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const filteredConcerts = useMemo(
    () => concerts.filter((concert) => {
      if (selectedStatus === 'On sale') return concert.status === 'ON_SALE';
      if (selectedStatus === 'Sold out') return concert.status === 'SOLD_OUT';
      return true;
    }),
    [concerts, selectedStatus],
  );
  const featuredConcert = concerts[0];

  function chooseStatus(status: (typeof statusFilters)[number]) {
    const next = new URLSearchParams(searchParams);
    if (status === 'All') next.delete('status');
    else next.set('status', status);
    setSearchParams(next);
  }

  return (
    <>
      <section className="hero">
        <RemoteImage className="hero-image" src={featuredConcert?.posterUrl ?? fallbackConcertImage} alt="" width="1800" height="1000" />
        <div className="hero-scrim" />
        <div className="hero-content page-width">
          <p className="eyebrow"><span /> Featured this week</p>
          <h1>Feel it live.<br /><em>Remember it forever.</em></h1>
          <p className="hero-copy">Find the nights you will talk about for years—live music, festivals, and culture across Vietnam.</p>
          <div className="hero-actions">
            {featuredConcert ? <Link className="button button-primary" to={`/concerts/${featuredConcert.id}`}>Explore the headline show <span aria-hidden="true">↗</span></Link> : null}
            <a className="text-link" href="#events">Browse all events <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>

      <section className="event-section page-width" id="events">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Live from the API</p><h2>Find your next <em>live moment.</em></h2></div>
          <p className="concert-count">{concerts.length} upcoming events</p>
        </div>
        <div className="category-row" aria-label="Concert status">
          {statusFilters.map((status) => (
            <button key={status} type="button" className={selectedStatus === status ? 'active' : ''} aria-pressed={selectedStatus === status} onClick={() => chooseStatus(status)}>{status}</button>
          ))}
        </div>
        {loading ? <LoadingGrid /> : null}
        {error ? <StatePanel title="The stage lights flickered." copy={error} action="Try again" onAction={() => setReloadKey((value) => value + 1)} /> : null}
        {!loading && !error && filteredConcerts.length ? (
          <div className="event-grid">
            {filteredConcerts.map((concert, index) => (
              <EventCard key={concert.id} priority={index < 2} event={{ id: concert.id, title: concert.title, venue: concert.venueName, eventDate: concert.eventDate, status: concert.status, image: concert.posterUrl }} />
            ))}
          </div>
        ) : null}
        {!loading && !error && !filteredConcerts.length ? <StatePanel title="No concerts here—yet." copy="Try another sale status or check back for newly announced events." action="Show all concerts" onAction={() => chooseStatus('All')} /> : null}
      </section>

      <section className="manifesto">
        <div className="page-width manifesto-inner">
          <p>TicketBox Selects</p>
          <blockquote>“The best memories begin before the first note.”</blockquote>
          <div className="manifesto-stat"><strong>{concerts.length || '—'}</strong><span>live events<br />now available</span></div>
        </div>
      </section>
    </>
  );
}

function LoadingGrid() {
  return <div className="event-grid" aria-label="Loading concerts" aria-live="polite">{[1, 2, 3].map((item) => <div className="event-skeleton" key={item}><div /><span /><span /></div>)}</div>;
}

function StatePanel({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) {
  return <div className="state-panel" role="status"><span className="state-icon" aria-hidden="true">!</span><h3>{title}</h3><p>{copy}</p><button className="button button-secondary" type="button" onClick={onAction}>{action}</button></div>;
}
