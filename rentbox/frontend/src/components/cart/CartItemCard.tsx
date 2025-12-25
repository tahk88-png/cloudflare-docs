import { CartItem } from '@/types';
import { formatCurrency, formatDateTime, formatDuration } from '@/utils/format';
import { Card, CardContent } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { PriceBreakdown } from './PriceBreakdown';
import { Trash2, Clock, Calendar } from 'lucide-react';
import { differenceInHours } from 'date-fns';

interface CartItemCardProps {
  item: CartItem;
  onRemove: (itemId: string) => void;
  onUpdate?: (itemId: string, startAt?: string, endAt?: string) => void;
  disabled?: boolean;
}

export function CartItemCard({
  item,
  onRemove,
  onUpdate,
  disabled = false,
}: CartItemCardProps) {
  const duration = differenceInHours(
    new Date(item.end_at),
    new Date(item.start_at)
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Product Info */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {item.product?.name || 'Product'}
                </h3>
                {item.product?.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {item.product.description}
                  </p>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                className="ml-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Time Range */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDateTime(item.start_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDateTime(item.end_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-gray-200 bg-gray-50 p-4 sm:border-l sm:border-t-0 sm:w-64">
            <PriceBreakdown breakdown={item.pricing_breakdown} compact />
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>
                  {formatCurrency(item.price + item.deposit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
