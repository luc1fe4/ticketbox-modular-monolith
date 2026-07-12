import { useEffect, useMemo, useState } from 'react';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiClientError, apiBaseUrl, isRequestCanceled } from '../../api/client';
import { getConcert, type ConcertDetail } from '../../api/concerts';
import { getAuthToken } from '../../features/auth/tokenCookie';
import {
  clearStoredQueueAdmission,
  joinQueue,
  leaveQueue,
  storeQueueAdmission,
  type QueueStatusResponse,
} from '../../api/queue';
import { eventDate } from '../../data/mockData';

export function WaitingRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
    let stompClient: Client | null = null;
    let subscription: StompSubscription | null = null;

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
        if (joined.status !== 'ADMITTED' && joined.status !== 'EXPIRED' && joined.status !== 'LEFT') {
          connectRealtime();
        }
      } catch (requestError) {
        if (active && !isRequestCanceled(requestError)) {
          setJoining(false);
          setError(messageForQueueError(requestError));
        }
      }
    }

    function connectRealtime() {
      const token = getAuthToken();
      if (!token || !active) return;

      stompClient = new Client({
        webSocketFactory: () => new SockJS(`${apiBaseUrl}/ws`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 2_000,
        heartbeatIncoming: 10_000,
        heartbeatOutgoing: 10_000,
        onConnect: () => {
          if (!active || !stompClient) return;
          subscription = stompClient.subscribe(`/user/queue/concerts/${concertId}`, (message: IMessage) => {
            try {
              handleStatus(JSON.parse(message.body) as QueueStatusResponse);
            } catch {
              setError('A live queue update could not be read. Reconnecting…');
            }
          });
          stompClient.publish({ destination: '/app/queue/subscribe', body: JSON.stringify({ concertId }) });
        },
        onStompError: () => {
          if (active) setError('Live queue connection interrupted. Reconnecting…');
        },
        onWebSocketClose: () => {
          if (active) setError('Live queue connection interrupted. Reconnecting…');
        },
      });
      stompClient.activate();
    }

    void join();

    return () => {
      active = false;
      controller.abort();
      subscription?.unsubscribe();
      void stompClient?.deactivate();
    };
  }, [id, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

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
  const isWaitingRoom = queueStatus?.status === 'WAITING_ROOM';
  const isClosed = queueStatus?.status === 'EXPIRED' || queueStatus?.status === 'LEFT';
  const position = queueStatus?.position ?? '-';
  const peopleAhead = queueStatus?.peopleAhead ?? '-';
  const waitingRoomCount = queueStatus?.waitingRoomCount ?? 0;
  const queueSize = queueStatus?.queueSize ?? 0;
  const activeShoppers = queueStatus?.activeShoppers ?? 0;

  return (
    <div className="waiting-room-page page-width">
      <div className="flow-topbar">
        <button className="back-link" type="button" onClick={() => void leave()}>{'<'} Event details</button>
        <div className="flow-steps" aria-label="Booking progress">
          <span className={isWaitingRoom ? 'active' : ''}>1 <i>Waiting room</i></span><b /><span className={isWaiting ? 'active' : ''}>2 <i>Queue</i></span><b /><span>3 <i>Tickets</i></span><b /><span>4 <i>Checkout</i></span>
        </div>
        <div className="timer" role="status">{isWaitingRoom ? `Sale opens in ${countdown(concert?.saleStartAt, now)}` : 'Live queue'}</div>
      </div>

      <section className="waiting-room-shell">
        <div className="waiting-room-panel" aria-live="polite">
          <div className="waiting-room-event">
            <span>{isWaitingRoom ? 'Waiting room' : 'Ticket queue'}</span>
            <strong>{concert?.title ?? 'Waiting room'}</strong>
            <p>
              {concert
                ? `${eventDate.format(new Date(concert.eventDate))} / ${concert.venueName}`
                : 'Hold your place while TicketBox admits buyers in order.'}
            </p>
          </div>

          {isWaitingRoom ? (
            <div className="waiting-room-countdown" role="timer" aria-label={`Ticket sales open in ${countdown(concert?.saleStartAt, now)}`}>
              <span>Ticket sales open in</span>
              <strong>{countdown(concert?.saleStartAt, now)}</strong>
            </div>
          ) : (
            <div className={`queue-orbit ${isWaiting ? 'is-waiting' : ''}`} aria-hidden="true">
              <span />
              <strong>{position}</strong>
            </div>
          )}

          <div className="queue-status-copy">
            <span>{joining ? 'Joining waiting room' : isWaitingRoom ? 'You are safely in the waiting room' : isWaiting ? 'You are in line' : isClosed ? 'Queue closed' : 'Checking access'}</span>
            <h2>{isWaitingRoom ? 'Your place will be assigned automatically' : isWaiting ? `${peopleAhead} ahead of you` : isClosed ? 'Your queue session ended' : 'Preparing your place'}</h2>
            <p>
              {isWaitingRoom
                ? `${waitingRoomCount} people are in the waiting room. At sale time TicketBox will snapshot this room once, randomly assign Queue places, then move everyone to the Queue automatically.`
                : isWaiting
                ? peopleAhead === 0
                  ? `You are first in the Queue. ${activeShoppers > 0 ? 'A ticket-selection slot is currently in use; you will be moved in automatically when it opens.' : 'We are preparing your ticket-selection slot.'}`
                  : `Estimated wait: ${waitLabel}. This page will move you forward automatically.`
                : isClosed
                  ? 'Join again to request a new shopping session for this concert.'
                  : 'Keep this tab open while we confirm your shopping session.'}
            </p>
          </div>

          {error ? <div className="waiting-room-error" role="alert">{error}</div> : null}

          <div className="queue-metrics">
            <div><span>{isWaitingRoom ? 'Sale starts' : 'Position'}</span><strong>{isWaitingRoom ? countdown(concert?.saleStartAt, now) : position}</strong></div>
            <div><span>{isWaitingRoom ? 'In waiting room' : 'People ahead'}</span><strong>{isWaitingRoom ? waitingRoomCount : peopleAhead}</strong></div>
            <div><span>{isWaitingRoom ? 'Assignment' : 'Waiting in Queue'}</span><strong>{isWaitingRoom ? 'Random at sale time' : queueSize}</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function countdown(saleStartAt: string | undefined, now: number) {
  if (!saleStartAt) return '--:--:--';
  const remainingSeconds = Math.max(0, Math.ceil((new Date(saleStartAt).getTime() - now) / 1_000));
  const hours = Math.floor(remainingSeconds / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
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
