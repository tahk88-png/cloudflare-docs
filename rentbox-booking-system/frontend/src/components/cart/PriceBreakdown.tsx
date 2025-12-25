// ═══════════════════════════════════════════════════════════════════════════
// PRICE BREAKDOWN COMPONENT
// Shows detailed pricing information for the entire cart
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Info, Tag, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { CartSummary, CartItem } from '../../types';
import { formatCurrency } from '../../utils/format';

interface PriceBreakdownProps {
  items: CartItem[];
  summary: CartSummary;
  className?: string;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  items,
  summary,
  className,
}) => {
  // Aggregate all adjustments across items
  const aggregatedAdjustments = items.reduce((acc, item) => {
    item.price_breakdown.adjustments.forEach((adj) => {
      const existing = acc.find((a) => a.name === adj.name);
      if (existing) {
        existing.amount += adj.amount;
      } else {
        acc.push({ ...adj });
      }
    });
    return acc;
  }, [] as { name: string; amount: number; description: string }[]);

  const hasDiscounts = aggregatedAdjustments.some((adj) => adj.amount < 0);
  const totalSavings = aggregatedAdjustments
    .filter((adj) => adj.amount < 0)
    .reduce((sum, adj) => sum + Math.abs(adj.amount), 0);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-4', className)}>
      <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>

      {/* Items breakdown */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-600 truncate max-w-[60%]">
              {item.product.name}
            </span>
            <span className="text-gray-900 font-medium">
              {formatCurrency(item.price_breakdown.base_price)}
            </span>
          </div>
        ))}
      </div>

      {/* Adjustments */}
      {aggregatedAdjustments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {aggregatedAdjustments.map((adj, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                {adj.amount < 0 && <Tag className="w-3.5 h-3.5 text-success-500" />}
                {adj.name}
              </span>
              <span
                className={cn(
                  'font-medium',
                  adj.amount < 0 ? 'text-success-600' : 'text-gray-900'
                )}
              >
                {adj.amount < 0 ? '-' : '+'}
                {formatCurrency(Math.abs(adj.amount))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Subtotal */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900 font-medium">
            {formatCurrency(summary.subtotal)}
          </span>
        </div>

        {/* Deposit */}
        {summary.total_deposit > 0 && (
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-600 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-primary-500" />
              Deposit (refundable)
            </span>
            <span className="text-gray-900 font-medium">
              {formatCurrency(summary.total_deposit)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(summary.total)}
          </span>
        </div>
        
        {hasDiscounts && (
          <p className="mt-1 text-sm text-success-600 text-right">
            You save {formatCurrency(totalSavings)}!
          </p>
        )}
      </div>

      {/* Info about deposit */}
      {summary.total_deposit > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex gap-2 text-sm">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700">
            The deposit will be refunded when you return the equipment in good
            condition.
          </p>
        </div>
      )}
    </div>
  );
};
