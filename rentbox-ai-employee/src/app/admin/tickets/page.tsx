'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  booking: {
    id: string;
    status: string;
    product: { name: string };
    user: { name: string; email: string };
  } | null;
  createdBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { aiActions: number };
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  async function fetchTickets() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);

      const response = await fetch(`/api/admin/tickets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function updateTicketStatus(ticketId: string, status: string) {
    try {
      const response = await fetch(`/api/admin/tickets?id=${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update ticket');
      await fetchTickets();
    } catch (err) {
      alert('Failed to update ticket: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

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
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/tickets"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
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
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-40 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_CUSTOMER">Waiting Customer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="block w-40 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">🔴 Urgent</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">🎫 Tickets</h2>
            <p className="text-sm text-gray-500">Manage support tickets</p>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tickets found</div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {ticket.title}
                        </h3>
                        <StatusBadge status={ticket.status} />
                        <CategoryBadge category={ticket.category} />
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                        {ticket.booking && (
                          <span>
                            📦 {ticket.booking.product.name} • {ticket.booking.user.name}
                          </span>
                        )}
                        <span>
                          👤 Created by {ticket.createdBy.name}
                        </span>
                        {ticket.assignedTo && (
                          <span>
                            🎯 Assigned to {ticket.assignedTo.name}
                          </span>
                        )}
                        <span>
                          🕒 {new Date(ticket.createdAt).toLocaleString()}
                        </span>
                        {ticket._count.aiActions > 0 && (
                          <span>
                            🤖 {ticket._count.aiActions} AI actions
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <select
                        value={ticket.status}
                        onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                        className="text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="WAITING_CUSTOMER">Waiting Customer</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    URGENT: { color: 'bg-red-500', text: '🔴' },
    HIGH: { color: 'bg-orange-500', text: '🟠' },
    MEDIUM: { color: 'bg-yellow-500', text: '🟡' },
    LOW: { color: 'bg-green-500', text: '🟢' },
  }[priority] || { color: 'bg-gray-500', text: '⚪' };

  return (
    <div className="text-xl" title={priority}>
      {config.text}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    OPEN: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    WAITING_CUSTOMER: 'bg-yellow-100 text-yellow-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-700',
  }[status] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
      {category.replace('_', ' ')}
    </span>
  );
}
