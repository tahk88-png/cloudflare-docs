import { PricingBreakdown } from '@/types';
import { formatCurrency } from '@/utils/format';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface PriceBreakdownProps {
  breakdown: PricingBreakdown;
  compact?: boolean;
}

export function PriceBreakdown({ breakdown, compact = false }: PriceBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Rental</span>
          <span className="font-medium">{formatCurrency(breakdown.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Deposit</span>
          <span className="font-medium">{formatCurrency(breakdown.deposit)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-semibold text-gray-900">Price Breakdown</h3>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base price</span>
            <span>{formatCurrency(breakdown.base_price)}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-500">
            <span>
              {breakdown.days > 0 && `${breakdown.days} day${breakdown.days > 1 ? 's' : ''}`}
              {breakdown.days > 0 && breakdown.hours % 24 > 0 && ' + '}
              {breakdown.hours % 24 > 0 && `${breakdown.hours % 24} hour${breakdown.hours % 24 > 1 ? 's' : ''}`}
            </span>
            <span>
              {breakdown.days > 0 && `${formatCurrency(breakdown.daily_rate)}/day`}
              {breakdown.days > 0 && breakdown.hours % 24 > 0 && ', '}
              {breakdown.hours % 24 > 0 && `${formatCurrency(breakdown.hourly_rate)}/hr`}
            </span>
          </div>

          {breakdown.adjustments.length > 0 && (
            <div className="space-y-2 border-t border-gray-200 pt-2">
              {breakdown.adjustments.map((adj, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {adj.name}
                    {adj.percentage && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({adj.percentage > 0 ? '+' : ''}{adj.percentage}%)
                      </span>
                    )}
                  </span>
                  <span className={adj.amount < 0 ? 'text-green-600' : ''}>
                    {adj.amount > 0 && '+'}
                    {formatCurrency(adj.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between border-t border-gray-300 pt-2 font-semibold">
            <span>Rental Total</span>
            <span>{formatCurrency(breakdown.total)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Deposit (refundable)</span>
            <span>{formatCurrency(breakdown.deposit)}</span>
          </div>

          <div className="flex justify-between border-t border-gray-300 pt-2 text-lg font-bold">
            <span>Total Due Now</span>
            <span>{formatCurrency(breakdown.total + breakdown.deposit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
