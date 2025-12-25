// ═══════════════════════════════════════════════════════════════════════════
// COUNTDOWN HOOK
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

interface UseCountdownOptions {
  onExpire?: () => void;
  interval?: number;
}

interface UseCountdownReturn {
  seconds: number;
  isExpired: boolean;
  isWarning: boolean; // Less than 2 minutes
  isCritical: boolean; // Less than 30 seconds
  reset: (newSeconds: number) => void;
}

export function useCountdown(
  initialSeconds: number,
  options: UseCountdownOptions = {}
): UseCountdownReturn {
  const { onExpire, interval = 1000 } = options;
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [seconds, interval, onExpire]);

  const reset = useCallback((newSeconds: number) => {
    setSeconds(newSeconds);
  }, []);

  return {
    seconds,
    isExpired: seconds <= 0,
    isWarning: seconds <= 120 && seconds > 30,
    isCritical: seconds <= 30 && seconds > 0,
    reset,
  };
}
