import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { Booking } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { formatDateTime, formatCurrency } from '@/utils/format';
import { Calendar, MapPin, Package } from 'lucide-react';

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter) {
        filters.status = statusFilter;
      }
      const data = await adminApi.getBookings(filters);
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRelease = async (bookingId: string) => {
    if (!confirm('Are you sure you want to force release this booking?')) {
      return;
    }

    try {
      await adminApi.forceRelease(bookingId, 'Force released by admin');
      await loadBookings();
      alert('Booking released successfully');
    } catch (err: any) {
      alert(`Failed to release booking: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      in_progress: 'bg-amber-100 text-amber-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-1 text-gray-600">Manage all rental bookings</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600">No bookings found</p>
            </CardContent>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {booking.product?.name || 'Product'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Booking ID: {booking.id.slice(0, 8)}
                        </p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <div>{formatDateTime(booking.start_at)}</div>
                          <div>{formatDateTime(booking.end_at)}</div>
                        </div>
                      </div>

                      {booking.compartment && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {(booking.compartment as any).locker_id} - Compartment{' '}
                            {(booking.compartment as any).compartment_number}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Package className="h-4 w-4" />
                        <span>{formatCurrency(booking.total_price)}</span>
                      </div>

                      {booking.pickup_code && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Pickup:</span>{' '}
                          <code className="rounded bg-gray-100 px-1">
                            {booking.pickup_code}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {booking.status === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleForceRelease(booking.id)}
                      >
                        Force Release
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
