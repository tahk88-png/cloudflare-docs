import { Clock, MapPin, Lock, RotateCcw } from 'lucide-react';
import type { Rental } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatTimeRemaining, getTimeRemainingColor } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatters';

interface RentalCardProps {
  rental: Rental;
  showActions?: boolean;
  onRentAgain?: (rentalId: string) => void;
}

export function RentalCard({ rental, showActions = false, onRentAgain }: RentalCardProps) {
  const isActive = rental.status === 'active';
  const isPast = rental.status === 'completed' || rental.status === 'cancelled';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {rental.imageUrl && (
        <div className="w-full h-40 sm:h-48 overflow-hidden bg-gray-100">
          <img 
            src={rental.imageUrl} 
            alt={rental.itemName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {rental.itemName}
            </h3>
            <p className="text-sm text-gray-600">{rental.itemType}</p>
          </div>
          <StatusBadge status={rental.status} variant="rental" />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <span>
              {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
            </span>
          </div>

          {isActive && (
            <div className={`flex items-center text-sm font-medium ${getTimeRemainingColor(rental.endDate)}`}>
              <Clock className="w-4 h-4 mr-2" />
              <span>{formatTimeRemaining(rental.endDate)}</span>
            </div>
          )}

          {rental.lockerLocation && (
            <div className="flex items-start text-sm text-gray-700">
              <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
              <span>{rental.lockerLocation}</span>
            </div>
          )}

          {rental.lockerCode && isActive && (
            <div className="flex items-center text-sm">
              <Lock className="w-4 h-4 mr-2 text-gray-400" />
              <span className="text-gray-700">Access Code:</span>
              <span className="ml-2 font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                {rental.lockerCode}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(rental.price, rental.currency)}
          </div>
          
          {showActions && isPast && onRentAgain && (
            <button
              onClick={() => onRentAgain(rental.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Rent Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
