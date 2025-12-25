// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD COMPONENT
// Overview of system status and key metrics
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Calendar, 
  CreditCard, 
  Lock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Clock
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/format';

interface SystemStats {
  carts_24h: {
    active: number;
    locked: number;
    completed: number;
    expired: number;
  };
  bookings: {
    confirmed: number;
    active: number;
    completed: number;
    overdue: number;
  };
  payments_24h: {
    total_revenue: number;
    pending_payments: number;
  };
  active_locks: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runCleanup = async () => {
    setIsRunningCleanup(true);
    try {
      await fetch('/api/admin/maintenance/cleanup', { method: 'POST' });
      await fetchStats();
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsRunningCleanup(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Failed to load statistics</p>
        <Button variant="secondary" onClick={fetchStats} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">System overview and management</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchStats}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Clock className="w-4 h-4" />}
            onClick={runCleanup}
            isLoading={isRunningCleanup}
          >
            Run Cleanup
          </Button>
        </div>
      </div>

      {/* Alert: Overdue bookings */}
      {stats.bookings.overdue > 0 && (
        <div className="flex items-center gap-3 p-4 bg-danger-50 border border-danger-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-danger-500" />
          <div>
            <p className="font-medium text-danger-800">
              {stats.bookings.overdue} overdue booking{stats.bookings.overdue !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-danger-600">
              Tools have not been returned on time. Review and take action.
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Carts */}
        <StatCard
          title="Active Carts"
          value={stats.carts_24h.active}
          subtitle={`${stats.carts_24h.locked} locked for checkout`}
          icon={<ShoppingCart className="w-5 h-5" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />

        {/* Active Bookings */}
        <StatCard
          title="Active Bookings"
          value={stats.bookings.confirmed + stats.bookings.active}
          subtitle={`${stats.bookings.active} tools out`}
          icon={<Calendar className="w-5 h-5" />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
        />

        {/* Revenue (24h) */}
        <StatCard
          title="Revenue (24h)"
          value={formatCurrency(stats.payments_24h.total_revenue)}
          subtitle={`${formatCurrency(stats.payments_24h.pending_payments)} pending`}
          icon={<TrendingUp className="w-5 h-5" />}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          isMonetary
        />

        {/* Active Locks */}
        <StatCard
          title="Active Locks"
          value={stats.active_locks}
          subtitle="Compartments reserved"
          icon={<Lock className="w-5 h-5" />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cart status breakdown */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart Status (24h)
          </h2>
          <div className="space-y-3">
            <StatusRow
              label="Active"
              value={stats.carts_24h.active}
              color="bg-blue-500"
              total={Object.values(stats.carts_24h).reduce((a, b) => a + b, 0)}
            />
            <StatusRow
              label="Locked"
              value={stats.carts_24h.locked}
              color="bg-yellow-500"
              total={Object.values(stats.carts_24h).reduce((a, b) => a + b, 0)}
            />
            <StatusRow
              label="Completed"
              value={stats.carts_24h.completed}
              color="bg-green-500"
              total={Object.values(stats.carts_24h).reduce((a, b) => a + b, 0)}
            />
            <StatusRow
              label="Expired"
              value={stats.carts_24h.expired}
              color="bg-gray-400"
              total={Object.values(stats.carts_24h).reduce((a, b) => a + b, 0)}
            />
          </div>
        </div>

        {/* Booking status breakdown */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Booking Status
          </h2>
          <div className="space-y-3">
            <StatusRow
              label="Confirmed (awaiting pickup)"
              value={stats.bookings.confirmed}
              color="bg-blue-500"
              total={Object.values(stats.bookings).reduce((a, b) => a + b, 0)}
            />
            <StatusRow
              label="Active (tool out)"
              value={stats.bookings.active}
              color="bg-green-500"
              total={Object.values(stats.bookings).reduce((a, b) => a + b, 0)}
            />
            <StatusRow
              label="Completed"
              value={stats.bookings.completed}
              color="bg-gray-400"
              total={Object.values(stats.bookings).reduce((a, b) => a + b, 0)}
            />
            <StatusRow
              label="Overdue"
              value={stats.bookings.overdue}
              color="bg-red-500"
              total={Object.values(stats.bookings).reduce((a, b) => a + b, 0)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  isMonetary?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  isMonetary,
}) => (
  <div className="card p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={cn(
          "mt-1 font-bold text-gray-900",
          isMonetary ? "text-2xl" : "text-3xl"
        )}>
          {value}
        </p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className={cn("p-3 rounded-lg", iconBg, iconColor)}>
        {icon}
      </div>
    </div>
  </div>
);

interface StatusRowProps {
  label: string;
  value: number;
  color: string;
  total: number;
}

const StatusRow: React.FC<StatusRowProps> = ({ label, value, color, total }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
