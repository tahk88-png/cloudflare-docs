import type { RentalStatus, InvoiceStatus } from '../types';

interface StatusBadgeProps {
  status: RentalStatus | InvoiceStatus;
  variant?: 'rental' | 'invoice';
}

const rentalStatusConfig: Record<RentalStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-success-100 text-success-700 border-success-200',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'bg-primary-100 text-primary-700 border-primary-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-error-100 text-error-700 border-error-200',
  },
};

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  paid: {
    label: 'Paid',
    className: 'bg-success-100 text-success-700 border-success-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning-100 text-warning-700 border-warning-200',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-error-100 text-error-700 border-error-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

export function StatusBadge({ status, variant = 'rental' }: StatusBadgeProps) {
  const config = variant === 'rental' 
    ? rentalStatusConfig[status as RentalStatus]
    : invoiceStatusConfig[status as InvoiceStatus];

  if (!config) {
    return null;
  }

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
