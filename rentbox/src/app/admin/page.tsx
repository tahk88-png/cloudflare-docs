"use client";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResponse, setOwnerResponse] = useState("");

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  const askIndrekAI = async () => {
      // We haven't built a dedicated route for this yet, let's just simulate or add it later.
      // For now, I'll mock the response in UI or add a route if needed.
      // Actually, I can use a server action or a new route.
      // Let's just create a new api route for owner-ai
      const res = await fetch('/api/owner-ai', {
          method: 'POST',
          body: JSON.stringify({ query: ownerQuery })
      });
      const json = await res.json();
      setOwnerResponse(json.response);
  };

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Rentbox Admin V2</h1>
        <div className="text-sm text-slate-500">System Status: Online</div>
      </header>
      
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card title="Overdue" value={data.stats.overdue} color="red" />
        <Card title="Open Tickets" value={data.stats.tickets} color="yellow" />
        <Card title="Active Rentals" value={data.stats.active} color="blue" />
        <Card title="Maintenance Holds" value={data.stats.maintenance} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COL: RISK & OWNER AI */}
        <div className="space-y-8">
            {/* OWNER AI */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 text-purple-700">Indrek AI Assistant</h2>
                <div className="flex gap-2 mb-4">
                    <input 
                        className="flex-1 border p-2 rounded" 
                        placeholder="Ask about risk, revenue..."
                        value={ownerQuery}
                        onChange={e => setOwnerQuery(e.target.value)}
                    />
                    <button onClick={askIndrekAI} className="bg-purple-600 text-white px-4 rounded">Ask</button>
                </div>
                {ownerResponse && (
                    <div className="bg-purple-50 p-3 rounded text-sm whitespace-pre-line">
                        {ownerResponse}
                    </div>
                )}
            </div>

            {/* HIGH RISK */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4 text-red-600">High Risk Bookings</h2>
                {data.highRisk.map((b: any) => (
                    <div key={b.id} className="border-b py-2 last:border-0">
                        <div className="flex justify-between">
                            <span className="font-bold">Score: {b.riskScore}</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{b.status}</span>
                        </div>
                        <p className="text-sm text-gray-600">{b.user.email}</p>
                        <p className="text-xs text-gray-500">{b.product.name}</p>
                    </div>
                ))}
                {data.highRisk.length === 0 && <p className="text-gray-400">No high risk bookings.</p>}
            </div>
        </div>

        {/* RIGHT COL: AI LOGS */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">AI Employee Activity Log</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                            <th className="p-3">Role</th>
                            <th className="p-3">Action Type</th>
                            <th className="p-3">Reason</th>
                            <th className="p-3">Outcome</th>
                            <th className="p-3">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recentActions.map((action: any) => (
                            <tr key={action.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{action.agentRole || '-'}</td>
                                <td className="p-3">{action.type}</td>
                                <td className="p-3 max-w-xs truncate" title={action.reason}>{action.reason}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        action.outcome.includes('success') ? 'bg-green-100 text-green-800' : 
                                        action.outcome.includes('fail') ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                                    }`}>
                                        {action.outcome}
                                    </span>
                                </td>
                                <td className="p-3 text-gray-400">{new Date(action.createdAt).toLocaleTimeString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}

function Card({ title, value, color }: any) {
    const colors: any = {
        red: "border-red-500 text-red-600",
        yellow: "border-yellow-500 text-yellow-600",
        blue: "border-blue-500 text-blue-600",
        orange: "border-orange-500 text-orange-600"
    };
    return (
        <div className={`bg-white p-6 rounded shadow border-l-4 ${colors[color]}`}>
            <h3 className="text-gray-500 text-sm uppercase tracking-wide">{title}</h3>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
}
