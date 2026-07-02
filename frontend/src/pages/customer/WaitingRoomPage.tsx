import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiClientError, isRequestCanceled } from '../../api/client';
import { getConcert, type ConcertDetail } from '../../api/concerts';
import {
  clearStoredQueueAdmission,
  getQueueStatus,
  joinQueue,
  leaveQueue,
  storeQueueAdmission,
  type QueueStatusResponse,
} from '../../api/queue';
import { eventDate } from '../../data/mockData';

const QUEUE_POLL_INTERVAL_MS = 3_000;

export function WaitingRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    getConcert(id, controller.signal)
      .then((detail) => {
        if (active) setConcert(detail);
      })
      .catch((requestError) => {
        if (active && !isRequestCanceled(requestError)) setError('This concert could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const concertId = id;
    const controller = new AbortController();
    let active = true;
    let timeoutId: number | undefined;

    async function pollStatus() {
      if (!active || controller.signal.aborted) return;
      if (document.visibilityState === 'hidden') {
        scheduleNext();
        return;
      }

      try {
        const nextStatus = await getQueueStatus(concertId, controller.signal);
        handleStatus(nextStatus);
      } catch (requestError) {
        if (active && !isRequestCanceled(requestError)) {
          setError(messageForQueueError(requestError));
        }
      } finally {
        if (active) scheduleNext();
      }
    }

    function scheduleNext() {
      window.clearTimeout(timeoutId);
      if (document.visibilityState === 'visible') {
        timeoutId = window.setTimeout(pollStatus, QUEUE_POLL_INTERVAL_MS);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timeoutId);
        void pollStatus();
      } else {
        window.clearTimeout(timeoutId);
      }
    }

    function handleStatus(nextStatus: QueueStatusResponse) {
      if (!active) return;
      setQueueStatus(nextStatus);
      setError(null);
      setJoining(false);

      if (nextStatus.status === 'ADMITTED') {
        const admission = storeQueueAdmission(concertId, nextStatus);
        if (admission) {
          navigate(`/concerts/${concertId}/seats`, { replace: true });
        }
      }
    }

    async function join() {
      clearStoredQueueAdmission();
      setJoining(true);
      setError(null);

      try {
        const joined = await joinQueue(concertId, controller.signal);
        handleStatus(joined);
      } catch (requestError) {
        if (active && !isRequestCanceled(requestError)) {
          setJoining(false);
          setError(messageForQueueError(requestError));
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void join();

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, navigate, retryKey]);

  const waitLabel = useMemo(() => {
    if (!queueStatus?.estimatedWaitSeconds) return 'Calculating';
    const minutes = Math.max(1, Math.ceil(queueStatus.estimatedWaitSeconds / 60));
    return minutes === 1 ? 'About 1 min' : `About ${minutes} mins`;
  }, [queueStatus]);

  async function leave() {
    if (id) {
      try {
        await leaveQueue(id);
      } catch {
        // Leaving is best-effort; route change should not be blocked by a network miss.
      }
    }
    clearStoredQueueAdmission();
    navigate(id ? `/concerts/${id}` : '/');
  }

  if (loading) {
    return <div className="selection-loading page-width"><div className="event-skeleton"><div /><span /><span /></div></div>;
  }

  const isWaiting = queueStatus?.status === 'WAITING';
  const isClosed = queueStatus?.status === 'EXPIRED' || queueStatus?.status === 'LEFT';
  const position = queueStatus?.position ?? '-';
  const peopleAhead = queueStatus?.peopleAhead ?? '-';

  return (
    <div className="waiting-room-page page-width">
      <div className="flow-topbar">
        <Link className="back-link" to={concert ? `/concerts/${concert.id}` : '/'}>{'<'} Event details</Link>
        <div className="flow-steps" aria-label="Booking progress">
          <span className="active">1 <i>Queue</i></span><b /><span>2 <i>Tickets</i></span><b /><span>3 <i>Checkout</i></span>
        </div>
        <div className="timer" role="status">Waiting room</div>
      </div>

      <section className="waiting-room-shell">
        <div className="waiting-room-panel" aria-live="polite">
          <div className="waiting-room-event">
            <span>Official queue</span>
            <strong>{concert?.title ?? 'Waiting room'}</strong>
            <p>
              {concert
                ? `${eventDate.format(new Date(concert.eventDate))} / ${concert.venueName}`
                : 'Hold your place while TicketBox admits buyers in order.'}
            </p>
          </div>

          <div className={`queue-orbit ${isWaiting ? 'is-waiting' : ''}`} aria-hidden="true">
            <span />
            <strong>{position}</strong>
          </div>

          <div className="queue-status-copy">
            <span>{joining ? 'Joining queue' : isWaiting ? 'You are in line' : isClosed ? 'Queue closed' : 'Checking access'}</span>
            <h2>{isWaiting ? `${peopleAhead} ahead of you` : isClosed ? 'Your queue session ended' : 'Preparing your place'}</h2>
            <p>
              {isWaiting
                ? `Estimated wait: ${waitLabel}. This page will move you forward automatically.`
                : isClosed
                  ? 'Join again to request a new shopping session for this concert.'
                  : 'Keep this tab open while we confirm your shopping session.'}
            </p>
          </div>

          {error ? <div className="waiting-room-error" role="alert">{error}</div> : null}

          <div className="queue-metrics">
            <div><span>Position</span><strong>{position}</strong></div>
            <div><span>People ahead</span><strong>{peopleAhead}</strong></div>
            <div><span>Estimate</span><strong>{waitLabel}</strong></div>
          </div>

          <div className="waiting-room-actions">
            <button className="button button-secondary" type="button" onClick={() => setRetryKey((value) => value + 1)}>
              Retry status
            </button>
            <button className="button button-primary" type="button" onClick={leave}>
              Leave queue
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function messageForQueueError(error: unknown) {
  if (error instanceof ApiClientError && error.status === 429) {
    return 'Too many queue requests. Please wait a moment before retrying.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'The waiting room could not be reached. Please try again.';
}
