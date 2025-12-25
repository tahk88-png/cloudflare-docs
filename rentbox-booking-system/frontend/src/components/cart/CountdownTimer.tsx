// ═══════════════════════════════════════════════════════════════════════════
// COUNTDOWN TIMER COMPONENT
// Shows remaining time before cart expires
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useCountdown } from '../../hooks/use-countdown';
import { formatCountdown } from '../../utils/format';

interface CountdownTimerProps {
  expiresInSeconds: number;
  onExpire?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresInSeconds,
  onExpire,
  className,
  variant = 'default',
}) => {
  const { seconds, isWarning, isCritical, isExpired } = useCountdown(
    expiresInSeconds,
    { onExpire }
  );

  if (isExpired) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-danger-600',
          variant === 'compact' ? 'text-sm' : 'text-base',
          className
        )}
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium">Cart expired</span>
      </div>
    );
  }

  const timeColor = isCritical
    ? 'text-danger-600'
    : isWarning
    ? 'text-warning-600'
    : 'text-gray-600';

  const bgColor = isCritical
    ? 'bg-danger-50'
    : isWarning
    ? 'bg-warning-50'
    : 'bg-gray-100';

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
          bgColor,
          timeColor,
          className
        )}
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="text-sm font-medium tabular-nums">
          {formatCountdown(seconds)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg',
        bgColor,
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full',
          isCritical
            ? 'bg-danger-100'
            : isWarning
            ? 'bg-warning-100'
            : 'bg-gray-200'
        )}
      >
        <Clock className={cn('w-5 h-5', timeColor)} />
      </div>
      <div>
        <p className="text-sm text-gray-600">Cart expires in</p>
        <p className={cn('text-xl font-bold tabular-nums', timeColor)}>
          {formatCountdown(seconds)}
        </p>
      </div>
      {isCritical && (
        <div className="ml-auto flex items-center gap-1 text-danger-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Hurry!</span>
        </div>
      )}
    </div>
  );
};
