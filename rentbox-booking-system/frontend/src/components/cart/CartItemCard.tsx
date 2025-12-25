// ═══════════════════════════════════════════════════════════════════════════
// CART ITEM CARD COMPONENT
// Displays a single cart item with time range and pricing
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  AlertCircle,
  Lock 
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import type { CartItem, LockStatus } from '../../types';
import { formatCurrency, formatDateRange, formatDuration } from '../../utils/format';

interface CartItemCardProps {
  item: CartItem;
  onRemove: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  isRemoving?: boolean;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onRemove,
  onEdit,
  isRemoving = false,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const getLockStatusDisplay = (status: LockStatus) => {
    switch (status) {
      case 'locked':
        return {
          icon: <Lock className="w-3.5 h-3.5" />,
          text: 'Reserved for you',
          className: 'badge-success',
        };
      case 'available':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          text: 'Available',
          className: 'badge-primary',
        };
      case 'unavailable':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          text: 'No longer available',
          className: 'badge-danger',
        };
    }
  };

  const lockDisplay = getLockStatusDisplay(item.lock_status);

  return (
    <div className="card p-4">
      {/* Header: Product info */}
      <div className="flex gap-4">
        {/* Product image */}
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
          {item.product.image_url ? (
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Clock className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Product details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 truncate">
                {item.product.name}
              </h3>
              {item.product.category && (
                <p className="text-sm text-gray-500 capitalize">
                  {item.product.category.replace('-', ' ')}
                </p>
              )}
            </div>
            <span className={cn('flex items-center gap-1', lockDisplay.className)}>
              {lockDisplay.icon}
              <span className="hidden sm:inline">{lockDisplay.text}</span>
            </span>
          </div>

          {/* Time range */}
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formatDateRange(item.start_at, item.end_at)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(item.start_at, item.end_at)}</span>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {showBreakdown ? 'Hide details' : 'View price breakdown'}
          </button>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(item.price)}
            </p>
            {item.deposit > 0 && (
              <p className="text-sm text-gray-500">
                + {formatCurrency(item.deposit)} deposit
              </p>
            )}
          </div>
        </div>

        {/* Price breakdown (collapsible) */}
        {showBreakdown && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm space-y-2 animate-fade-in">
            <div className="flex justify-between">
              <span className="text-gray-600">Base price</span>
              <span className="text-gray-900">
                {formatCurrency(item.price_breakdown.base_price)}
              </span>
            </div>
            
            {item.price_breakdown.adjustments.map((adj, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-600">{adj.name}</span>
                <span className={cn(
                  adj.amount < 0 ? 'text-success-600' : 'text-gray-900'
                )}>
                  {adj.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(adj.amount))}
                </span>
              </div>
            ))}
            
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(item.price_breakdown.subtotal)}
              </span>
            </div>
            
            {item.price_breakdown.deposit > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Deposit (refundable)</span>
                <span className="text-gray-900">
                  {formatCurrency(item.price_breakdown.deposit)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Total</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(item.price_breakdown.total)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Edit2 className="w-4 h-4" />}
          onClick={() => onEdit(item.id)}
          className="flex-1"
        >
          Edit Time
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Trash2 className="w-4 h-4" />}
          onClick={() => onRemove(item.id)}
          isLoading={isRemoving}
          className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
        >
          Remove
        </Button>
      </div>
    </div>
  );
};
