import { Package, Clock, FileText, Wallet } from 'lucide-react';
import type { DashboardSummary as DashboardSummaryType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DashboardSummaryProps {
  summary: DashboardSummaryType;
}

export function DashboardSummary({ summary }: DashboardSummaryProps) {
  const stats = [
    {
      label: 'Active Rentals',
      value: summary.activeRentalsCount,
      icon: Package,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
    },
    {
      label: 'Upcoming',
      value: summary.upcomingRentalsCount,
      icon: Clock,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      label: 'Pending Invoices',
      value: summary.pendingInvoicesCount,
      icon: FileText,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50',
    },
    {
      label: 'Total Spent',
      value: formatCurrency(summary.totalSpent, summary.currency),
      icon: Wallet,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">
                  {stat.label}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bgColor} rounded-lg p-2`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
