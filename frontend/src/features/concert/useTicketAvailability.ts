import { useCallback, useEffect, useRef, useState } from 'react';
import { isRequestCanceled } from '../../api/client';
import { getConcertTicketTypes, type TicketType } from '../../api/concerts';

const AVAILABILITY_POLL_INTERVAL_MS = 4_000;

export function useTicketAvailability(concertId?: string, refreshKey = 0) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatesDelayed, setUpdatesDelayed] = useState(false);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const refreshRef = useRef<() => void>(() => undefined);

  const refresh = useCallback(() => {
    refreshRef.current();
  }, []);

  useEffect(() => {
    if (!concertId) {
      setTicketTypes([]);
      setLoading(false);
      return;
    }

    const activeConcertId = concertId;
    const controller = new AbortController();
    let active = true;
    let hasLoadedInventory = false;
    let requestInProgress = false;
    let timeoutId: number | undefined;
    setLoading(true);
    setInitialLoadFailed(false);

    function scheduleNextRefresh() {
      window.clearTimeout(timeoutId);
      if (document.visibilityState === 'visible' && !controller.signal.aborted) {
        timeoutId = window.setTimeout(runRefresh, AVAILABILITY_POLL_INTERVAL_MS);
      }
    }

    async function runRefresh() {
      if (requestInProgress || controller.signal.aborted) return;
      if (document.visibilityState === 'hidden') {
        scheduleNextRefresh();
        return;
      }

      requestInProgress = true;
      try {
        const types = await getConcertTicketTypes(activeConcertId, controller.signal);
        if (!active) return;
        setTicketTypes(types.filter((item) => item.isActive));
        setLastUpdatedAt(new Date());
        setUpdatesDelayed(false);
        setInitialLoadFailed(false);
        hasLoadedInventory = true;
      } catch (requestError) {
        if (active && !isRequestCanceled(requestError)) {
          setUpdatesDelayed(true);
          if (!hasLoadedInventory) setInitialLoadFailed(true);
        }
      } finally {
        requestInProgress = false;
        if (active) {
          setLoading(false);
          scheduleNextRefresh();
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timeoutId);
        void runRefresh();
      } else {
        window.clearTimeout(timeoutId);
      }
    }

    refreshRef.current = () => {
      window.clearTimeout(timeoutId);
      void runRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void runRefresh();

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      refreshRef.current = () => undefined;
    };
  }, [concertId, refreshKey]);

  return {
    ticketTypes,
    loading,
    updatesDelayed,
    initialLoadFailed,
    lastUpdatedAt,
    refresh,
  };
}
