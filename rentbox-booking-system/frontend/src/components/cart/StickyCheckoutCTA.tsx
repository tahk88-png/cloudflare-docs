// ═══════════════════════════════════════════════════════════════════════════
// STICKY CHECKOUT CTA COMPONENT
// Mobile-optimized sticky bottom bar for checkout
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import type { CartSummary, ValidationResult } from '../../types';
import { formatCurrency, formatCountdown } from '../../utils/format';
import { useCountdown } from '../../hooks/use-countdown';

interface StickyCheckoutCTAProps {
  summary: CartSummary;
  expiresInSeconds: number;
  validationResult?: ValidationResult | null;
  onCheckout: () => void;
  isCheckingOut?: boolean;
  onCartExpire?: () => void;
  className?: string;
}

export const StickyCheckoutCTA: React.FC<StickyCheckoutCTAProps> = ({
  summary,
  expiresInSeconds,
  validationResult,
  onCheckout,
  isCheckingOut = false,
  onCartExpire,
  className,
}) => {
  const { seconds, isWarning, isCritical, isExpired } = useCountdown(
    expiresInSeconds,
    { onExpire: onCartExpire }
  );

  const isValid = validationResult?.valid === true;
  const hasItems = summary.items_count > 0;
  const canCheckout = hasItems && isValid && !isExpired;

  const timerColor = isCritical
    ? 'text-danger-600 bg-danger-50'
    : isWarning
    ? 'text-warning-600 bg-warning-50'
    : 'text-gray-600 bg-gray-100';

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200',
        'px-4 py-3 safe-bottom z-50',
        'lg:hidden', // Only show on mobile/tablet
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Price and timer */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.total)}
            </span>
            {summary.items_count > 0 && (
              <span className="text-sm text-gray-500">
                ({summary.items_count} item{summary.items_count !== 1 ? 's' : ''})
              </span>
            )}
          </div>

          {/* Timer */}
          {hasItems && !isExpired && (
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs mt-1',
                timerColor
              )}
            >
              <Clock className="w-3 h-3" />
              <span className="font-medium tabular-nums">
                {formatCountdown(seconds)}
              </span>
              {isCritical && (
                <>
                  <AlertTriangle className="w-3 h-3 ml-1" />
                  <span>Hurry!</span>
                </>
              )}
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-1 text-danger-600 text-xs mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Cart expired</span>
            </div>
          )}
        </div>

        {/* Checkout button */}
        <Button
          variant="primary"
          size="lg"
          onClick={onCheckout}
          disabled={!canCheckout}
          isLoading={isCheckingOut}
          rightIcon={!isCheckingOut && <ArrowRight className="w-5 h-5" />}
          className="flex-shrink-0"
        >
          Checkout
        </Button>
      </div>

      {/* Validation warning */}
      {!isValid && hasItems && (
        <p className="text-xs text-warning-600 mt-2 text-center">
          Please validate your cart before checkout
        </p>
      )}
    </div>
  );
};
