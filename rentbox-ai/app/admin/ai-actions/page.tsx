'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AIActionsPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action_type: '',
    agent_type: ''
  });

  useEffect(() => {
    loadActions();
  }, [filters]);

  const loadActions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.agent_type) params.append('agent_type', filters.agent_type);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/ai-actions?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setActions(data.actions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load AI actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOutcomeColor = (outcome: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-gray-100 text-gray-800'
    };
    return colors[outcome as keyof typeof colors] || colors.success;
  };

  const getAgentColor = (agent: string) => {
    const colors = {
      support: 'bg-blue-100 text-blue-800',
      ops: 'bg-purple-100 text-purple-800',
      sales: 'bg-green-100 text-green-800',
      automation: 'bg-orange-100 text-orange-800'
    };
    return colors[agent as keyof typeof colors] || colors.support;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">AI Actions Log</h1>
            <Link href="/admin" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Action Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.slice(0, 8).map((stat) => (
              <div key={stat.action_type} className="border rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-600">{stat.count}</p>
                <p className="text-sm text-gray-600">{stat.action_type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={filters.action_type}
                onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="send_email">Send Email</option>
                <option value="send_sms">Send SMS</option>
                <option value="create_ticket">Create Ticket</option>
                <option value="open_locker">Open Locker</option>
                <option value="reminder_sent">Reminder Sent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Type
              </label>
              <select
                value={filters.agent_type}
                onChange={(e) => setFilters({ ...filters, agent_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="support">Support</option>
                <option value="ops">Operations</option>
                <option value="sales">Sales</option>
                <option value="automation">Automation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading actions...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No actions found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {actions.map((action) => (
                    <tr key={action.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{action.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {action.action_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {action.agent_type && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getAgentColor(action.agent_type)}`}>
                            {action.agent_type}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                        {action.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getOutcomeColor(action.outcome)}`}>
                          {action.outcome}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(action.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
