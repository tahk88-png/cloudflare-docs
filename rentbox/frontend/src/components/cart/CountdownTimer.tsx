import { useEffect, useState } from 'react';
import { formatTimeRemaining } from '@/utils/format';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.floor((expiry - now) / 1000);
      return Math.max(0, diff);
    };

    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const isUrgent = secondsRemaining <= 120; // Less than 2 minutes
  const isExpired = secondsRemaining === 0;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
        isExpired
          ? 'bg-red-100 text-red-900'
          : isUrgent
          ? 'bg-amber-100 text-amber-900'
          : 'bg-blue-50 text-blue-900'
      }`}
    >
      {isExpired ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <div className="flex-1">
        <div className="text-sm font-medium">
          {isExpired ? 'Cart Expired' : 'Time Remaining'}
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {formatTimeRemaining(secondsRemaining)}
        </div>
      </div>
    </div>
  );
}
