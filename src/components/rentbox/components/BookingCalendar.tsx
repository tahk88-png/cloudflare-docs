import React, { useState, useEffect, useCallback } from 'react';
import { DateCalendar } from './DateCalendar';
import { TimeSelection } from './TimeSelection';
import type { BookingCalendarProps, BookingSelection, DayAvailability } from '../types/booking';
import { formatDateKey, getPreviousMonth, getNextMonth } from '../utils/dateUtils';

/**
 * BookingCalendar - Main orchestrator component for Rentbox booking flow
 * Flow: Date → Start time → End time → Confirm
 */
export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  onBookingConfirm,
  fetchAvailability,
  minBookingDuration = 60,
  maxBookingDuration = 1440,
  businessHoursStart = '00:00',
  businessHoursEnd = '23:45',
  slotInterval = 15,
  isLoading: externalLoading = false,
  error: externalError = null,
  onSelectionChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Map<string, DayAvailability>>(new Map());
  const [selection, setSelection] = useState<BookingSelection>({
    date: null,
    startTime: null,
    endTime: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Load availability data when month changes
  useEffect(() => {
    const loadAvailability = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        
        const data = await fetchAvailability(year, month);
        
        const availabilityMap = new Map<string, DayAvailability>();
        data.forEach(day => {
          const key = formatDateKey(day.date);
          availabilityMap.set(key, day);
        });
        
        setAvailability(availabilityMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability');
        console.error('Failed to load availability:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAvailability();
  }, [currentMonth, fetchAvailability]);
  
  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selection);
    }
  }, [selection, onSelectionChange]);
  
  const handleDateSelect = useCallback((date: Date) => {
    setSelection({
      date,
      startTime: null,
      endTime: null,
    });
  }, []);
  
  const handleStartTimeSelect = useCallback((time: string) => {
    if (time === '') {
      // Reset to date selection
      setSelection(prev => ({
        ...prev,
        startTime: null,
        endTime: null,
      }));
    } else {
      setSelection(prev => ({
        ...prev,
        startTime: time,
        endTime: null,
      }));
    }
  }, []);
  
  const handleEndTimeSelect = useCallback((time: string) => {
    setSelection(prev => ({
      ...prev,
      endTime: time,
    }));
  }, []);
  
  const handleMonthChange = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? getPreviousMonth(prev) : getNextMonth(prev)
    );
  }, []);
  
  const handleConfirm = async () => {
    if (!selection.date || !selection.startTime || !selection.endTime) return;
    
    setIsConfirming(true);
    setError(null);
    
    try {
      await onBookingConfirm({
        date: selection.date,
        startTime: selection.startTime,
        endTime: selection.endTime,
      });
      
      // Reset selection after successful booking
      setSelection({
        date: null,
        startTime: null,
        endTime: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
      console.error('Failed to confirm booking:', err);
    } finally {
      setIsConfirming(false);
    }
  };
  
  const handleBack = () => {
    if (selection.endTime) {
      setSelection(prev => ({ ...prev, endTime: null }));
    } else if (selection.startTime) {
      setSelection(prev => ({ ...prev, startTime: null }));
    } else if (selection.date) {
      setSelection(prev => ({ ...prev, date: null }));
    }
  };
  
  const canConfirm = selection.date && selection.startTime && selection.endTime;
  const showDateCalendar = !selection.date;
  const showTimeSelection = selection.date;
  
  const selectedDayAvailability = selection.date 
    ? availability.get(formatDateKey(selection.date))
    : null;
  
  const displayError = externalError || error;
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-medium ${selection.date ? 'text-[#1DB954]' : 'text-[#0F172A]'}`}>
            1. Select date
          </span>
          <span className={`text-sm font-medium ${selection.startTime ? 'text-[#1DB954]' : selection.date ? 'text-[#0F172A]' : 'text-[#9CA3AF]'}`}>
            2. Select time
          </span>
          <span className={`text-sm font-medium ${canConfirm ? 'text-[#1DB954]' : 'text-[#9CA3AF]'}`}>
            3. Confirm
          </span>
        </div>
        <div className="flex gap-2">
          <div className={`h-2 flex-1 rounded-full ${selection.date ? 'bg-[#1DB954]' : 'bg-[#E2E8E4]'}`} />
          <div className={`h-2 flex-1 rounded-full ${selection.startTime ? 'bg-[#1DB954]' : 'bg-[#E2E8E4]'}`} />
          <div className={`h-2 flex-1 rounded-full ${canConfirm ? 'bg-[#1DB954]' : 'bg-[#E2E8E4]'}`} />
        </div>
      </div>
      
      {/* Error message */}
      {displayError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[#DC2626] mb-1">Error</p>
            <p className="text-sm text-[#DC2626]/80">{displayError}</p>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="bg-[#F7F9F8] rounded-2xl p-4 sm:p-6 lg:p-8">
        {showDateCalendar && (
          <DateCalendar
            currentDate={currentMonth}
            selectedDate={selection.date}
            availability={availability}
            onDateSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
            isLoading={isLoading || externalLoading}
          />
        )}
        
        {showTimeSelection && selectedDayAvailability && (
          <TimeSelection
            selectedDate={selection.date}
            selectedStartTime={selection.startTime}
            selectedEndTime={selection.endTime}
            availableSlots={selectedDayAvailability.availableSlots}
            onStartTimeSelect={handleStartTimeSelect}
            onEndTimeSelect={handleEndTimeSelect}
            minDuration={minBookingDuration}
            maxDuration={maxBookingDuration}
            slotInterval={slotInterval}
          />
        )}
      </div>
      
      {/* Action buttons - sticky on mobile */}
      <div className="sticky bottom-0 mt-6 p-4 bg-white border-t border-[#E2E8E4] rounded-xl flex gap-3 shadow-lg sm:shadow-none sm:static sm:border-0 sm:bg-transparent sm:p-0">
        {(selection.date || selection.startTime || selection.endTime) && (
          <button
            onClick={handleBack}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-[#E2E8E4] bg-white text-[#0F172A] font-medium hover:border-[#1DB954] hover:bg-[#F7F9F8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2"
          >
            Back
          </button>
        )}
        
        {canConfirm && (
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-1 px-8 py-3 rounded-xl bg-[#1DB954] text-white font-semibold hover:bg-[#159A46] disabled:bg-[#CBD5CF] disabled:text-[#6B7280] disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2"
          >
            {isConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Confirming...
              </span>
            ) : (
              'Confirm Booking'
            )}
          </button>
        )}
      </div>
    </div>
  );
};
