'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  metrics: {
    overdue_bookings: number;
    locker_failures: number;
    pending_payments: number;
    critical_tickets: number;
    active_rentals: number;
  };
  risks: {
    overdue_bookings: any[];
    locker_failures: any[];
    pending_payments: any[];
  };
  tickets: {
    urgent: any[];
    high_priority: any[];
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      const result = await response.json();
      if (result.success) {
        setData(result.dashboard);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Rentbox AI Employee - Admin Dashboard</h1>
            <div className="flex space-x-4">
              <Link href="/admin/tickets" className="text-blue-600 hover:text-blue-800">
                View All Tickets
              </Link>
              <Link href="/admin/ai-actions" className="text-blue-600 hover:text-blue-800">
                AI Actions Log
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Overdue Bookings"
            value={data.metrics.overdue_bookings}
            color="red"
            icon="⚠️"
          />
          <MetricCard
            title="Locker Failures"
            value={data.metrics.locker_failures}
            color="orange"
            icon="🔒"
          />
          <MetricCard
            title="Pending Payments"
            value={data.metrics.pending_payments}
            color="yellow"
            icon="💳"
          />
          <MetricCard
            title="Critical Tickets"
            value={data.metrics.critical_tickets}
            color="purple"
            icon="🎫"
          />
          <MetricCard
            title="Active Rentals"
            value={data.metrics.active_rentals}
            color="green"
            icon="✅"
          />
        </div>

        {/* Risk Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Overdue Bookings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">⚠️</span>
              Overdue Bookings
            </h2>
            <div className="space-y-3">
              {data.risks.overdue_bookings.length === 0 ? (
                <p className="text-gray-500 text-sm">No overdue bookings</p>
              ) : (
                data.risks.overdue_bookings.slice(0, 5).map((booking: any) => (
                  <div key={booking.id} className="border-l-4 border-red-500 pl-3 py-2">
                    <p className="font-medium">Booking #{booking.id}</p>
                    <p className="text-sm text-gray-600">
                      {booking.user?.full_name || booking.user?.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(booking.end_time).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Locker Failures */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">🔒</span>
              Locker Failures
            </h2>
            <div className="space-y-3">
              {data.risks.locker_failures.length === 0 ? (
                <p className="text-gray-500 text-sm">No locker failures</p>
              ) : (
                data.risks.locker_failures.map((failure: any) => (
                  <div key={failure.booking_id} className="border-l-4 border-orange-500 pl-3 py-2">
                    <p className="font-medium">Booking #{failure.booking_id}</p>
                    <p className="text-sm text-gray-600">
                      Failures: {failure.count}
                    </p>
                    <p className="text-sm text-gray-500">
                      {failure.payload?.error || 'Unknown error'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tickets */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🎫</span>
            Critical Tickets
          </h2>
          
          {/* Urgent Tickets */}
          {data.tickets.urgent.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-semibold text-red-600 mb-3">Urgent</h3>
              <div className="space-y-2">
                {data.tickets.urgent.map((ticket: any) => (
                  <div key={ticket.id} className="border border-red-200 rounded p-3 bg-red-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">#{ticket.id}: {ticket.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Status: {ticket.status} | Category: {ticket.category}
                        </p>
                      </div>
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High Priority Tickets */}
          {data.tickets.high_priority.length > 0 && (
            <div>
              <h3 className="text-md font-semibold text-orange-600 mb-3">High Priority</h3>
              <div className="space-y-2">
                {data.tickets.high_priority.slice(0, 5).map((ticket: any) => (
                  <div key={ticket.id} className="border border-orange-200 rounded p-3 bg-orange-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">#{ticket.id}: {ticket.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{ticket.description.substring(0, 100)}...</p>
                      </div>
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="ml-4 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.tickets.urgent.length === 0 && data.tickets.high_priority.length === 0 && (
            <p className="text-gray-500 text-sm">No critical tickets at the moment</p>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{title}</p>
    </div>
  );
}
