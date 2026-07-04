import { useEffect, useMemo, useState } from 'react';

export type Countdown = {
  remainingMs: number;
  remainingSeconds: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isWarning: boolean;
  isExpired: boolean;
};

function remainingUntil(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, target - Date.now());
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function useCountdown(expiresAt?: string | null, warningThresholdSeconds = 120): Countdown {
  const [remainingMs, setRemainingMs] = useState(() => remainingUntil(expiresAt) ?? 0);

  useEffect(() => {
    const tick = () => setRemainingMs(remainingUntil(expiresAt) ?? 0);
    tick();
    if (!expiresAt) return undefined;

    const intervalId = window.setInterval(tick, 1_000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt]);

  return useMemo(() => {
    const hasExpiry = Boolean(expiresAt);
    const remainingSeconds = Math.ceil(remainingMs / 1_000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return {
      remainingMs,
      remainingSeconds,
      minutes,
      seconds,
      formatted: formatCountdown(remainingSeconds),
      isWarning: hasExpiry && remainingSeconds > 0 && remainingSeconds <= warningThresholdSeconds,
      isExpired: hasExpiry && remainingMs <= 0,
    };
  }, [expiresAt, remainingMs, warningThresholdSeconds]);
}
