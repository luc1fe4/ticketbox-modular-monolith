import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isRequestCanceled } from '../../api/client';
import { getConcert, getConcerts, getConcertTicketTypes, type ConcertDetail, type ConcertSummary, type TicketType } from '../../api/concerts';
import { EventCard } from '../../components/EventCard';
import { RemoteImage } from '../../components/RemoteImage';
import { currency, eventDate } from '../../data/mockData';

export function ConcertDetailPage() {
  const { id } = useParams();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [relatedConcerts, setRelatedConcerts] = useState<ConcertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getConcert(id, controller.signal), getConcertTicketTypes(id, controller.signal), getConcerts(0, 4, controller.signal)])
      .then(([detail, types, page]) => {
        if (!active) return;
        setConcert(detail);
        setTicketTypes(types);
        setRelatedConcerts(page.content.filter((item) => item.id !== detail.id).slice(0, 3));
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active && !isRequestCanceled(requestError)) setError('This concert could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, reloadKey]);

  const lowestPrice = useMemo(() => {
    const prices = ticketTypes.filter((item) => item.isActive).map((item) => item.price);
    return prices.length ? Math.min(...prices) : null;
  }, [ticketTypes]);

  if (loading) return <div className="detail-skeleton" aria-live="polite"><div className="detail-skeleton-hero" /><div className="page-width detail-skeleton-copy"><span /><span /><span /></div></div>;
  if (error || !concert) {
    return <div className="page-width detail-error state-panel"><span className="state-icon">!</span><h1>Concert unavailable</h1><p>{error ?? 'The requested concert was not found.'}</p><button className="button button-primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</button><Link className="text-link" to="/">Return to all concerts</Link></div>;
  }

  const concertDate = new Date(concert.eventDate);
  const doorsOpen = concert.doorsOpenAt ? new Intl.DateTimeFormat('en-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(concert.doorsOpenAt)) : 'To be announced';
  const unavailable = concert.status !== 'ON_SALE';

  return (
    <>
      <section className="detail-hero">
        <RemoteImage src={concert.posterUrl ?? undefined} alt="" width="1800" height="1000" />
        <div className="detail-overlay" />
        <div className="detail-hero-content page-width">
          <Link className="back-link" to="/">← All concerts</Link>
          <div className="detail-title"><p className="eyebrow"><span /> Live in Vietnam · {concert.status.replace('_', ' ')}</p><h1>{concert.title}</h1><p className="artist-line">An official TicketBox experience</p></div>
          <div className="detail-facts"><Fact label="Date" value={eventDate.format(concertDate)} /><Fact label="Doors open" value={doorsOpen} /><Fact label="Venue" value={concert.venueName} /></div>
        </div>
      </section>
      <section className="detail-body page-width">
        <article className="detail-story">
          <p className="eyebrow"><span /> About the night</p>
          <h2>A live experience shaped around <em>sound, light, and connection.</em></h2>
          <p>{concert.description || 'A one-night live experience created for music lovers.'}</p>
          {concert.artistBio ? <section className="artist-section"><p className="eyebrow"><span /> About the artist</p><h2>Meet the story behind <em>the stage.</em></h2><p className="artist-biography">{concert.artistBio}</p></section> : null}
          <div className="feature-row"><Feature number="01" title="Immersive production" copy="A cinematic stage and spatial sound." /><Feature number="02" title="Official inventory" copy={`${ticketTypes.length} verified ticket zones.`} /><Feature number="03" title="Easy entry" copy="Mobile tickets and dedicated support." /></div>
        </article>
        <aside className="booking-card">
          <p className="booking-label">{lowestPrice === null ? 'Ticket information' : 'Tickets from'}</p>
          <p className="booking-price">{lowestPrice === null ? 'Coming soon' : currency.format(lowestPrice)}</p>
          <div className="booking-divider" />
          <div className="booking-detail"><span>Date</span><strong>{eventDate.format(concertDate)}</strong></div>
          <div className="booking-detail"><span>Location</span><strong>{concert.venueAddress}</strong></div>
          <div className="booking-detail"><span>Admission</span><strong>Mobile ticket</strong></div>
          {unavailable ? <button className="button button-disabled" type="button" disabled>{concert.status === 'SOLD_OUT' ? 'Sold out' : 'Not on sale'}</button> : <Link className="button button-primary button-block" to={`/concerts/${concert.id}/seats`}>View seat map <span aria-hidden="true">→</span></Link>}
          <p className="secure-note">Secure checkout · Official ticket partner</p>
        </aside>
      </section>
      <section className="venue-section"><div className="page-width venue-grid"><div><p className="eyebrow"><span /> The venue</p><h2>{concert.venueName}</h2><p>{concert.venueAddress}</p><a className="text-link" href="#map">View venue map ↓</a></div><div className="map-art" id="map" aria-label={`Stylized map of ${concert.venueName}`}><span className="map-pin">T</span><i className="road road-one" /><i className="road road-two" /><i className="road road-three" /></div></div></section>
      {relatedConcerts.length ? <section className="more-events page-width"><div className="section-heading"><div><p className="eyebrow"><span /> Keep exploring</p><h2>You may also <em>love.</em></h2></div><Link className="text-link" to="/">See all concerts →</Link></div><div className="event-grid event-grid-three">{relatedConcerts.map((item) => <EventCard key={item.id} event={{ id: item.id, title: item.title, venue: item.venueName, eventDate: item.eventDate, status: item.status, image: item.posterUrl }} />)}</div></section> : null}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function Feature({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="detail-feature"><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>;
}
