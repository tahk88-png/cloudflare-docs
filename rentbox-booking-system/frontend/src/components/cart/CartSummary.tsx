// ═══════════════════════════════════════════════════════════════════════════
// CART SUMMARY COMPONENT
// Overview of cart contents with checkout button
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ShoppingCart, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { CountdownTimer } from './CountdownTimer';
import type { Cart, ValidationResult } from '../../types';
import { formatCurrency } from '../../utils/format';

interface CartSummaryProps {
  cart: Cart;
  validationResult?: ValidationResult | null;
  onCheckout: () => void;
  onValidate: () => void;
  isValidating?: boolean;
  isCheckingOut?: boolean;
  onCartExpire?: () => void;
  className?: string;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cart,
  validationResult,
  onCheckout,
  onValidate,
  isValidating = false,
  isCheckingOut = false,
  onCartExpire,
  className,
}) => {
  const { summary, expires_in_seconds, items } = cart;
  const hasItems = items.length > 0;
  const isValid = validationResult?.valid === true;
  const hasErrors = validationResult?.errors && validationResult.errors.length > 0;
  const hasWarnings = validationResult?.warnings && validationResult.warnings.length > 0;

  // Check if any items have availability issues
  const hasAvailabilityIssues = items.some(
    (item) => item.lock_status === 'unavailable'
  );

  const canCheckout = hasItems && isValid && !hasAvailabilityIssues;

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Your Cart</h2>
          </div>
          <span className="text-sm text-gray-500">
            {summary.items_count} item{summary.items_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Timer */}
      {hasItems && (
        <div className="p-4 border-b border-gray-100">
          <CountdownTimer
            expiresInSeconds={expires_in_seconds}
            onExpire={onCartExpire}
            variant="default"
          />
        </div>
      )}

      {/* Validation Status */}
      {validationResult && (
        <div className="p-4 border-b border-gray-100">
          {isValid && !hasWarnings && (
            <div className="flex items-center gap-2 text-success-600 bg-success-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Cart validated - ready to checkout</span>
            </div>
          )}

          {hasErrors && (
            <div className="space-y-2">
              {validationResult.errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-danger-600 bg-danger-50 p-3 rounded-lg"
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error.message}</span>
                </div>
              ))}
            </div>
          )}

          {hasWarnings && !hasErrors && (
            <div className="space-y-2">
              {validationResult.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-warning-600 bg-warning-50 p-3 rounded-lg"
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{warning.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{formatCurrency(summary.subtotal)}</span>
        </div>
        
        {summary.total_deposit > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Deposit</span>
            <span className="text-gray-900">
              {formatCurrency(summary.total_deposit)}
            </span>
          </div>
        )}
        
        <div className="flex justify-between pt-3 border-t border-gray-100">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(summary.total)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 space-y-2">
        {!validationResult && hasItems && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onValidate}
            isLoading={isValidating}
            className="w-full"
          >
            Validate Cart
          </Button>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={onCheckout}
          disabled={!canCheckout}
          isLoading={isCheckingOut}
          rightIcon={<ArrowRight className="w-5 h-5" />}
          className="w-full"
        >
          Proceed to Checkout
        </Button>

        {!hasItems && (
          <p className="text-sm text-center text-gray-500 mt-2">
            Your cart is empty
          </p>
        )}

        {hasAvailabilityIssues && (
          <p className="text-sm text-center text-danger-600 mt-2">
            Some items are no longer available. Please remove them to continue.
          </p>
        )}
      </div>
    </div>
  );
};
