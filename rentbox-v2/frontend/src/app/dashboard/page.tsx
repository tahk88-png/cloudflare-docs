'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Booking } from '@/lib/types';
import { BookingCard } from '@/components/booking/BookingCard';

export default function DashboardPage() {
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get('/bookings');
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const activeBookings = bookings?.filter((b) => ['active', 'paid'].includes(b.status)) || [];
  const pastBookings = bookings?.filter((b) => ['completed', 'cancelled'].includes(b.status)) || [];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Minu Rendid</h1>

        {activeBookings.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Active & Upcoming Rentals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        )}

        {pastBookings.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Past Rentals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        )}

        {bookings?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No bookings yet</p>
          </div>
        )}
      </div>
    </main>
  );
}
