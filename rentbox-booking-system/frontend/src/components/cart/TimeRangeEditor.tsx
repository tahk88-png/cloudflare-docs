// ═══════════════════════════════════════════════════════════════════════════
// TIME RANGE EDITOR COMPONENT
// Modal/popover for editing rental time range
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, addHours, addDays, isBefore, isAfter } from 'date-fns';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import type { CartItem } from '../../types';
import { formatDuration } from '../../utils/format';

interface TimeRangeEditorProps {
  item: CartItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (startAt: string, endAt: string) => Promise<void>;
  isLoading?: boolean;
}

export const TimeRangeEditor: React.FC<TimeRangeEditorProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [startDate, setStartDate] = useState(
    format(new Date(item.start_at), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState(
    format(new Date(item.end_at), "yyyy-MM-dd'T'HH:mm")
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const now = new Date();
  const minDateTime = format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm");

  const validateDates = (): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isBefore(start, now)) {
      setError('Start time cannot be in the past');
      return false;
    }

    if (isBefore(end, start)) {
      setError('End time must be after start time');
      return false;
    }

    const hoursDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 1) {
      setError('Minimum rental duration is 1 hour');
      return false;
    }

    if (hoursDiff > 90 * 24) {
      setError('Maximum rental duration is 90 days');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validateDates()) return;

    try {
      await onSave(new Date(startDate).toISOString(), new Date(endDate).toISOString());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time range');
    }
  };

  const quickOptions = [
    { label: '2 hours', getValue: () => addHours(new Date(startDate), 2) },
    { label: '4 hours', getValue: () => addHours(new Date(startDate), 4) },
    { label: '1 day', getValue: () => addDays(new Date(startDate), 1) },
    { label: '3 days', getValue: () => addDays(new Date(startDate), 3) },
    { label: '1 week', getValue: () => addDays(new Date(startDate), 7) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl animate-slide-up sm:animate-fade-in safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Edit Rental Time</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Product info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{item.product.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Current: {formatDuration(item.start_at, item.end_at)}
            </p>
          </div>

          {/* Date inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startDate}
                min={minDateTime}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError(null);
                }}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError(null);
                }}
                className="input"
              />
            </div>
          </div>

          {/* Quick duration options */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Duration</p>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => {
                    const newEnd = option.getValue();
                    setEndDate(format(newEnd, "yyyy-MM-dd'T'HH:mm"));
                    setError(null);
                  }}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-full border transition-colors',
                    'hover:border-primary-500 hover:text-primary-600',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration display */}
          <div className="p-3 bg-primary-50 rounded-lg">
            <p className="text-sm text-primary-700">
              <span className="font-medium">Selected duration:</span>{' '}
              {formatDuration(startDate, endDate)}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-danger-50 rounded-lg text-danger-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-100">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            isLoading={isLoading}
            className="flex-1"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
