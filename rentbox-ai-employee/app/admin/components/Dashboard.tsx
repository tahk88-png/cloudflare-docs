'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  risk: {
    overdue: number;
    open_failed: number;
    payment_pending: number;
  };
  tickets: {
    open: number;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-red-600">Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Risk Dashboard */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Risk Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <h3 className="text-sm font-medium text-gray-500">Overdue Bookings</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{data.risk.overdue}</p>
            <p className="text-sm text-gray-500 mt-1">Active bookings past end time</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <h3 className="text-sm font-medium text-gray-500">Open Failed</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{data.risk.open_failed}</p>
            <p className="text-sm text-gray-500 mt-1">Bookings with failed open attempts</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-500">Payment Pending</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{data.risk.payment_pending}</p>
            <p className="text-sm text-gray-500 mt-1">Pending payments (24h)</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/tickets"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900">Tickets</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{data.tickets.open}</p>
            <p className="text-sm text-gray-500 mt-1">Open tickets</p>
          </Link>
          <Link
            href="/admin/ai-actions"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900">AI Actions</h3>
            <p className="text-sm text-gray-500 mt-1">View all AI actions log</p>
          </Link>
          <Link
            href="/admin/events"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900">Events</h3>
            <p className="text-sm text-gray-500 mt-1">View system events</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
