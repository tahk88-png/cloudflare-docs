'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AiAction {
  id: string;
  action: string;
  reason: string;
  outcome: string;
  agentRole: string | null;
  triggeredBy: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  inputSummary: string | null;
  outputSummary: string | null;
  booking: {
    id: string;
    status: string;
    user: { name: string; email: string };
    product: { name: string };
  } | null;
  ticket: {
    id: string;
    title: string;
    status: string;
  } | null;
  event: {
    id: string;
    type: string;
  } | null;
}

export default function ActionsPage() {
  const [actions, setActions] = useState<AiAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedAction, setSelectedAction] = useState<AiAction | null>(null);

  useEffect(() => {
    fetchActions();
  }, [search, outcomeFilter, agentFilter]);

  async function fetchActions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (outcomeFilter) params.set('outcome', outcomeFilter);
      if (agentFilter) params.set('agentRole', agentFilter);

      const response = await fetch(`/api/admin/actions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch actions');
      const data = await response.json();
      setActions(data.actions);
      setStats(data.stats?.last24h || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Tickets
              </Link>
              <Link
                href="/admin/actions"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                AI Actions
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Success (24h)"
            value={stats.SUCCESS || 0}
            color="green"
          />
          <StatCard
            label="Failed (24h)"
            value={stats.FAILED || 0}
            color="red"
          />
          <StatCard
            label="Skipped (24h)"
            value={stats.SKIPPED || 0}
            color="yellow"
          />
          <StatCard
            label="Pending (24h)"
            value={stats.PENDING || 0}
            color="gray"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actions, reasons, errors..."
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome
              </label>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="block w-40 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Outcomes</option>
                <option value="SUCCESS">✅ Success</option>
                <option value="FAILED">❌ Failed</option>
                <option value="SKIPPED">⏭️ Skipped</option>
                <option value="PENDING">⏳ Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent
              </label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="block w-40 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Agents</option>
                <option value="SUPPORT">Support</option>
                <option value="OPS">Operations</option>
                <option value="SALES">Sales</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">🤖 AI Actions Log</h2>
            <p className="text-sm text-gray-500">Complete audit trail of AI decisions</p>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : actions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No actions found</div>
          ) : (
            <div className="divide-y">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedAction(action)}
                >
                  <div className="flex items-start gap-4">
                    <OutcomeBadge outcome={action.outcome} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {action.action}
                        </span>
                        {action.agentRole && (
                          <AgentBadge agent={action.agentRole} />
                        )}
                        <span className="text-xs text-gray-400">
                          {action.triggeredBy}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {action.reason}
                      </p>
                      {action.error && (
                        <p className="text-sm text-red-600 mt-1">
                          ⚠️ {action.error}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                        {action.booking && (
                          <span>📦 {action.booking.product.name}</span>
                        )}
                        {action.ticket && (
                          <span>🎫 {action.ticket.title.substring(0, 30)}...</span>
                        )}
                        {action.event && (
                          <span>📡 {action.event.type}</span>
                        )}
                        <span>
                          🕒 {new Date(action.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Detail Modal */}
        {selectedAction && (
          <ActionDetailModal
            action={selectedAction}
            onClose={() => setSelectedAction(null)}
          />
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'green' | 'red' | 'yellow' | 'gray';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const config = {
    SUCCESS: { icon: '✅', color: 'text-green-600' },
    FAILED: { icon: '❌', color: 'text-red-600' },
    SKIPPED: { icon: '⏭️', color: 'text-yellow-600' },
    PENDING: { icon: '⏳', color: 'text-gray-600' },
  }[outcome] || { icon: '❓', color: 'text-gray-600' };

  return (
    <span className={`text-xl ${config.color}`} title={outcome}>
      {config.icon}
    </span>
  );
}

function AgentBadge({ agent }: { agent: string }) {
  const config = {
    SUPPORT: 'bg-blue-100 text-blue-700',
    OPS: 'bg-orange-100 text-orange-700',
    SALES: 'bg-purple-100 text-purple-700',
  }[agent] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${config}`}>
      {agent}
    </span>
  );
}

function ActionDetailModal({
  action,
  onClose,
}: {
  action: AiAction;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <OutcomeBadge outcome={action.outcome} />
              <h2 className="text-xl font-bold text-gray-900">{action.action}</h2>
              {action.agentRole && <AgentBadge agent={action.agentRole} />}
            </div>
            <p className="text-sm text-gray-500 mt-1">{action.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <DetailSection title="Reason" content={action.reason} />
          
          {action.error && (
            <DetailSection
              title="Error"
              content={action.error}
              className="bg-red-50 text-red-700"
            />
          )}

          <DetailSection title="Triggered By" content={action.triggeredBy} />

          <div className="grid grid-cols-2 gap-4">
            <DetailSection
              title="Created"
              content={new Date(action.createdAt).toLocaleString()}
            />
            {action.completedAt && (
              <DetailSection
                title="Completed"
                content={new Date(action.completedAt).toLocaleString()}
              />
            )}
          </div>

          {action.inputSummary && (
            <DetailSection title="Input" content={action.inputSummary} code />
          )}

          {action.outputSummary && (
            <DetailSection title="Output" content={action.outputSummary} code />
          )}

          {action.booking && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Related Booking</h4>
              <p className="text-sm text-gray-600">
                📦 {action.booking.product.name}<br />
                👤 {action.booking.user.name} ({action.booking.user.email})<br />
                Status: {action.booking.status}
              </p>
            </div>
          )}

          {action.ticket && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Related Ticket</h4>
              <p className="text-sm text-gray-600">
                🎫 {action.ticket.title}<br />
                Status: {action.ticket.status}
              </p>
            </div>
          )}

          {action.event && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Related Event</h4>
              <p className="text-sm text-gray-600">
                📡 {action.event.type}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  content,
  className = '',
  code = false,
}: {
  title: string;
  content: string;
  className?: string;
  code?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-1">{title}</h4>
      {code ? (
        <pre className={`text-sm bg-gray-100 rounded-lg p-3 overflow-x-auto ${className}`}>
          {content}
        </pre>
      ) : (
        <p className={`text-sm text-gray-600 ${className}`}>{content}</p>
      )}
    </div>
  );
}
