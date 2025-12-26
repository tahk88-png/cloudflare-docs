import { Download, CreditCard, Calendar } from 'lucide-react';
import type { Invoice } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatters';

interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    // In production, this would trigger actual download
    window.open(invoice.downloadUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {invoice.invoiceNumber}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Issued: {formatDate(invoice.issueDate)}
          </p>
        </div>
        <StatusBadge status={invoice.status} variant="invoice" />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Amount</span>
          <span className="font-bold text-gray-900">
            {formatCurrency(invoice.amount, invoice.currency)}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>Due: {formatDate(invoice.dueDate)}</span>
        </div>

        {invoice.paidDate && (
          <div className="flex items-center text-sm text-success-600">
            <CreditCard className="w-4 h-4 mr-2" />
            <span>Paid: {formatDate(invoice.paidDate)}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
      >
        <Download className="w-4 h-4" />
        Download Invoice
      </button>
    </div>
  );
}
