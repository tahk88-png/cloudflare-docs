import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="bg-error-50 border border-error-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-semibold text-error-900 mb-1">Error</h3>
        <p className="text-sm text-error-700">{message}</p>
      </div>
    </div>
  );
}
