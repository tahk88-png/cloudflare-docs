import { CartTotals } from '@/types';
import { formatCurrency } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';

interface CartSummaryProps {
  totals: CartTotals;
  itemCount: number;
}

export function CartSummary({ totals, itemCount }: CartSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Items ({itemCount})</span>
          <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Deposit (refundable)</span>
          <span className="font-medium">{formatCurrency(totals.total_deposit)}</span>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-medium">Deposit Protection</p>
          <p className="mt-1 text-xs">
            Your deposit of {formatCurrency(totals.total_deposit)} will be
            refunded after you return the item(s) in good condition.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
