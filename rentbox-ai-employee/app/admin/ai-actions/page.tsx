'use client';

import { useEffect, useState } from 'react';

interface AIAction {
  id: number;
  action_type: string;
  reason: string | null;
  outcome: string | null;
  created_at: string;
  email: string | null;
  name: string | null;
  booking_id: number | null;
}

export default function AIActionsPage() {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');

  useEffect(() => {
    fetchActions();
  }, [search, actionTypeFilter]);

  const fetchActions = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionTypeFilter) params.append('action_type', actionTypeFilter);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/ai-actions?${params}`);
      const data = await response.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error('Failed to fetch AI actions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading AI actions...</div>;
  }

  return (
    <>
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">AI Actions Log</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by reason or outcome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
            <select
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="">All Action Types</option>
              <option value="send_email">Send Email</option>
              <option value="send_sms">Send SMS</option>
              <option value="create_ticket">Create Ticket</option>
              <option value="locker_open">Locker Open</option>
              <option value="reminder_24h_sent">24h Reminder</option>
              <option value="overdue_notice_sent">Overdue Notice</option>
            </select>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {actions.map((action) => (
                <tr key={action.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{action.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      {action.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{action.reason || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{action.outcome || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {action.name ? `${action.name} (${action.email})` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {action.booking_id ? `#${action.booking_id}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(action.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {actions.length === 0 && (
            <div className="text-center py-8 text-gray-500">No AI actions found</div>
          )}
        </div>
      </div>
    </>
  );
}
