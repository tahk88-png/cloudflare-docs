"use client";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Console</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded shadow border-l-4 border-red-500">
          <h3 className="text-gray-500">Overdue Bookings</h3>
          <p className="text-3xl font-bold">{stats.overdueBookings}</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-yellow-500">
          <h3 className="text-gray-500">Open Tickets</h3>
          <p className="text-3xl font-bold">{stats.pendingTickets}</p>
        </div>
        <div className="bg-white p-6 rounded shadow border-l-4 border-green-500">
          <h3 className="text-gray-500">System Status</h3>
          <p className="text-3xl font-bold">Online</p>
        </div>
      </div>

      <div className="bg-white rounded shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent AI Actions</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-2">Type</th>
              <th className="py-2">Reason</th>
              <th className="py-2">Outcome</th>
              <th className="py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentActions?.map((action: any) => (
              <tr key={action.id} className="border-b last:border-0">
                <td className="py-2 capitalize">{action.type}</td>
                <td className="py-2">{action.reason}</td>
                <td className="py-2">{action.outcome}</td>
                <td className="py-2 text-gray-500 text-sm">{new Date(action.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
