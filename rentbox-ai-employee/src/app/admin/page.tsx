'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  risk: {
    overdueBookings: Array<{
      id: string;
      customer: string;
      email: string;
      phone: string;
      product: string;
      locker: string;
      location: string;
      compartment: string;
      endDate: string;
      daysOverdue: number;
    }>;
    openFailedEvents: Array<{
      id: string;
      bookingId: string;
      customer: string;
      locker: string;
      createdAt: string;
    }>;
    pendingPayments: Array<{
      id: string;
      bookingId: string;
      customer: string;
      product: string;
      amount: number;
      startDate: string;
      createdAt: string;
    }>;
  };
  metrics: {
    overdueCount: number;
    openFailedCount: number;
    pendingPaymentsCount: number;
    pendingPaymentsTotal: number;
  };
  summary: {
    activeBookings: number;
    openTickets: number;
    eventsThisWeek: number;
    messagesThisWeek: number;
    bookingsByStatus: Record<string, number>;
    ticketsByPriority: Record<string, number>;
  };
  recentActions: Array<{
    id: string;
    action: string;
    reason: string;
    outcome: string;
    agentRole: string | null;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🤖 Rentbox AI Employee
              </h1>
              <p className="text-sm text-gray-500">Admin Console v1.0</p>
            </div>
            <nav className="flex gap-4">
              <Link
                href="/admin"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/tickets"
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Tickets
              </Link>
              <Link
                href="/admin/actions"
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                AI Actions
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Bookings"
            value={data.summary.activeBookings}
            icon="📦"
            color="blue"
          />
          <MetricCard
            title="Open Tickets"
            value={data.summary.openTickets}
            icon="🎫"
            color="yellow"
          />
          <MetricCard
            title="Events (7d)"
            value={data.summary.eventsThisWeek}
            icon="📡"
            color="purple"
          />
          <MetricCard
            title="Messages (7d)"
            value={data.summary.messagesThisWeek}
            icon="💬"
            color="green"
          />
        </div>

        {/* Risk Dashboard */}
        <div className="bg-white rounded-xl shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">⚠️ Risk Dashboard</h2>
            <p className="text-sm text-gray-500">Items requiring attention</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Overdue Bookings */}
            <RiskSection
              title="Overdue Rentals"
              count={data.metrics.overdueCount}
              items={data.risk.overdueBookings}
              renderItem={(item) => (
                <div key={item.id} className="p-3 bg-red-50 rounded-lg mb-2">
                  <div className="font-medium text-red-900">{item.customer}</div>
                  <div className="text-sm text-red-700">
                    {item.product} • {item.daysOverdue} days overdue
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {item.locker}, {item.compartment}
                  </div>
                </div>
              )}
              emptyMessage="No overdue rentals"
              color="red"
            />

            {/* Locker Failures */}
            <RiskSection
              title="Locker Failures"
              count={data.metrics.openFailedCount}
              items={data.risk.openFailedEvents}
              renderItem={(item) => (
                <div key={item.id} className="p-3 bg-orange-50 rounded-lg mb-2">
                  <div className="font-medium text-orange-900">{item.customer || 'Unknown'}</div>
                  <div className="text-sm text-orange-700">{item.locker}</div>
                  <div className="text-xs text-orange-600 mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              )}
              emptyMessage="No recent failures"
              color="orange"
            />

            {/* Pending Payments */}
            <RiskSection
              title="Pending Payments"
              count={data.metrics.pendingPaymentsCount}
              items={data.risk.pendingPayments}
              renderItem={(item) => (
                <div key={item.id} className="p-3 bg-yellow-50 rounded-lg mb-2">
                  <div className="font-medium text-yellow-900">{item.customer}</div>
                  <div className="text-sm text-yellow-700">
                    €{item.amount} • {item.product}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    Start: {new Date(item.startDate).toLocaleDateString()}
                  </div>
                </div>
              )}
              emptyMessage="No pending payments"
              color="yellow"
            />
          </div>
        </div>

        {/* Recent AI Actions */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">🤖 Recent AI Actions</h2>
              <p className="text-sm text-gray-500">Today&apos;s automated actions</p>
            </div>
            <Link
              href="/admin/actions"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All →
            </Link>
          </div>

          <div className="divide-y">
            {data.recentActions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No actions recorded today
              </div>
            ) : (
              data.recentActions.map((action) => (
                <div key={action.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getOutcomeColor(action.outcome)}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {action.action}
                        </span>
                        {action.agentRole && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {action.agentRole}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${getOutcomeBadge(action.outcome)}`}>
                          {action.outcome}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{action.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(action.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'yellow' | 'purple' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{title}</div>
        </div>
      </div>
    </div>
  );
}

function RiskSection<T>({
  title,
  count,
  items,
  renderItem,
  emptyMessage,
  color,
}: {
  title: string;
  count: number;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage: string;
  color: 'red' | 'orange' | 'yellow';
}) {
  const colorClasses = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-lg font-bold ${colorClasses[color]}`}>{count}</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {emptyMessage}
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case 'SUCCESS':
      return 'bg-green-500';
    case 'FAILED':
      return 'bg-red-500';
    case 'SKIPPED':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
}

function getOutcomeBadge(outcome: string): string {
  switch (outcome) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    case 'SKIPPED':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
