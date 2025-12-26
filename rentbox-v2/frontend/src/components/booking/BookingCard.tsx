'use client';

import { Booking } from '@/lib/types';
import { format } from 'date-fns';
import { et } from 'date-fns/locale';
import { Clock, MapPin, Package } from 'lucide-react';

interface BookingCardProps {
  booking: Booking;
}

export function BookingCard({ booking }: BookingCardProps) {
  const startDate = new Date(booking.startAt);
  const endDate = new Date(booking.endAt);
  const now = new Date();

  const isActive = booking.status === 'active' && now >= startDate && now <= endDate;
  const isUpcoming = booking.status === 'paid' && now < startDate;
  const isPast = booking.status === 'completed' || (now > endDate && booking.status !== 'overdue');

  const getStatusColor = () => {
    switch (booking.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{booking.product?.name || 'Unknown Product'}</h3>
          <p className="text-sm text-muted-foreground">
            {booking.compartment?.locker?.name || 'Unknown Locker'}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
          {booking.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {format(startDate, 'PPp', { locale: et })} - {format(endDate, 'PPp', { locale: et })}
          </span>
        </div>

        {booking.compartment && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>Compartment {booking.compartment.number}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span>
            {booking.totalPrice.toFixed(2)} {booking.currency} (+ {booking.depositAmount.toFixed(2)} deposit)
          </span>
        </div>
      </div>

      {isActive && (
        <div className="mt-4 p-3 bg-green-50 rounded">
          <p className="text-sm font-medium text-green-900">
            Active rental - Return by {format(endDate, 'PPp', { locale: et })}
          </p>
        </div>
      )}
    </div>
  );
}
