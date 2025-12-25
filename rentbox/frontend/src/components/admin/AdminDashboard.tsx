import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { 
  ShoppingCart, 
  Calendar, 
  CheckCircle, 
  DollarSign,
  Lock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      setCleaning(true);
      const result = await adminApi.cleanup();
      alert(`Cleanup completed:\n- Expired carts: ${result.expired_carts}\n- Expired locks: ${result.expired_locks}`);
      await loadStats();
    } catch (err: any) {
      alert(`Cleanup failed: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Carts',
      value: stats?.active_carts || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Bookings',
      value: stats?.active_bookings || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Completed Bookings',
      value: stats?.completed_bookings || 0,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Active Locks',
      value: stats?.active_locks || 0,
      icon: Lock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(Number(stats?.total_revenue) || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Successful Payments',
      value: stats?.successful_payments || 0,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600">Rentbox.ee System Overview</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadStats}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={handleCleanup}
              disabled={cleaning}
            >
              {cleaning ? 'Cleaning...' : 'Run Cleanup'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="w-full">
                  View All Carts
                </Button>
                <Button variant="outline" className="w-full">
                  View All Bookings
                </Button>
                <Button variant="outline" className="w-full">
                  Compartment Timeline
                </Button>
                <Button variant="outline" className="w-full">
                  Payment Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expired Carts</span>
                  <span className="text-sm font-medium">{stats?.expired_carts || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confirmed Bookings</span>
                  <span className="text-sm font-medium">{stats?.confirmed_bookings || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
