import { FileText, Download, Eye } from 'lucide-react';
import type { Agreement } from '../types';
import { formatDate } from '../utils/dateUtils';

interface AgreementCardProps {
  agreement: Agreement;
}

export function AgreementCard({ agreement }: AgreementCardProps) {
  const handleView = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(agreement.documentUrl, '_blank');
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    // In production, this would trigger actual download
    const link = document.createElement('a');
    link.href = agreement.documentUrl;
    link.download = `${agreement.agreementNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {agreement.agreementNumber}
          </h3>
          <p className="text-xs text-gray-600">
            Signed: {formatDate(agreement.signedDate)}
          </p>
          <p className="text-xs text-gray-500 mt-1 capitalize">
            {agreement.documentType.replace('_', ' ')}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleView}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
    </div>
  );
}
