// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT SUCCESS COMPONENT
// Confirmation page after successful payment
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { CheckCircle, MapPin, Key, Clock, Calendar, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import type { Booking } from '../../types';
import { formatCurrency, formatDateRange } from '../../utils/format';

interface CheckoutSuccessProps {
  bookings: Booking[];
  onViewBookings: () => void;
  onContinueShopping: () => void;
}

export const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({
  bookings,
  onViewBookings,
  onContinueShopping,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-50 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600">
            Your rental has been successfully booked. Check your email for
            confirmation details.
          </p>
        </div>

        {/* Booking cards */}
        <div className="space-y-4 mb-8">
          {bookings.map((booking) => (
            <BookingConfirmationCard key={booking.id} booking={booking} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onViewBookings}
            rightIcon={<ArrowRight className="w-5 h-5" />}
            className="flex-1"
          >
            View My Bookings
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={onContinueShopping}
            className="flex-1"
          >
            Continue Shopping
          </Button>
        </div>

        {/* Next steps */}
        <div className="mt-8 p-6 bg-primary-50 rounded-xl">
          <h2 className="font-semibold text-primary-900 mb-4">Next Steps</h2>
          <ol className="space-y-3 text-sm text-primary-800">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0 text-primary-900 font-medium">
                1
              </span>
              <span>
                Check your email for booking confirmation with pickup codes
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0 text-primary-900 font-medium">
                2
              </span>
              <span>
                Go to the locker location at your scheduled start time
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0 text-primary-900 font-medium">
                3
              </span>
              <span>
                Enter your pickup code on the keypad to unlock the compartment
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0 text-primary-900 font-medium">
                4
              </span>
              <span>
                Return the tool before the end time to get your deposit back
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BOOKING CONFIRMATION CARD
// ═══════════════════════════════════════════════════════════════════════════

interface BookingConfirmationCardProps {
  booking: Booking;
}

const BookingConfirmationCard: React.FC<BookingConfirmationCardProps> = ({
  booking,
}) => {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="font-mono text-sm text-gray-900">
              {booking.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <span className="badge-success">Confirmed</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Product */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
            {booking.product.image_url ? (
              <img
                src={booking.product.image_url}
                alt={booking.product.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Clock className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{booking.product.name}</h3>
            {booking.product.category && (
              <p className="text-sm text-gray-500 capitalize">
                {booking.product.category.replace('-', ' ')}
              </p>
            )}
          </div>
        </div>

        {/* Time range */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDateRange(booking.start_at, booking.end_at)}</span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">
              {booking.compartment.locker_name}
            </p>
            <p className="text-gray-500">
              {booking.compartment.locker_location}
            </p>
            <p className="text-gray-500">
              Compartment {booking.compartment.compartment_number}
            </p>
          </div>
        </div>

        {/* Pickup code */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">
              Pickup Code
            </span>
          </div>
          <p className="text-3xl font-bold text-primary-600 tracking-wider font-mono">
            {booking.pickup_code}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Enter this code on the locker keypad to unlock
          </p>
        </div>

        {/* Price */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <span className="text-gray-600">Total paid</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(booking.total_price + booking.deposit_amount)}
          </span>
        </div>
      </div>
    </div>
  );
};
