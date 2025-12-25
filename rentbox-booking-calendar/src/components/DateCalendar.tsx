import React, { useCallback } from 'react';
import type { CalendarViewProps } from '../types/booking';
import {
  formatDateKey,
  getCalendarDays,
  getMonthName,
  getYear,
  getDayOfWeekShort,
  isToday,
  isPastDate,
  isSameDay,
} from '../utils/dateUtils';

/**
 * DateCalendar - Month grid view for date selection
 * Follows Rentbox brand guidelines with Scandinavian minimalism
 */
export const DateCalendar: React.FC<CalendarViewProps> = ({
  currentDate,
  selectedDate,
  availability,
  onDateSelect,
  onMonthChange,
  isLoading = false,
}) => {
  const calendarDays = getCalendarDays(currentDate);
  const monthName = getMonthName(currentDate);
  const year = getYear(currentDate);
  
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };
  
  const getDayClasses = useCallback((date: Date): string => {
    const dateKey = formatDateKey(date);
    const dayAvailability = availability.get(dateKey);
    const isPast = isPastDate(date);
    const isSelected = isSameDay(date, selectedDate);
    const isTodayDate = isToday(date);
    const isOtherMonth = !isCurrentMonth(date);
    
    let classes = 'relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ';
    classes += 'focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2 ';
    classes += 'min-h-[60px] sm:min-h-[72px] ';
    
    // Disabled state (past or other month)
    if (isPast || isOtherMonth) {
      classes += 'bg-[#F1F3F2] text-[#9CA3AF] cursor-not-allowed ';
      return classes;
    }
    
    // Selected state
    if (isSelected) {
      classes += 'bg-[#1DB954] text-white cursor-pointer font-semibold shadow-md ';
      return classes;
    }
    
    // Today state
    if (isTodayDate) {
      classes += 'border-2 border-[#1DB954] text-[#1DB954] bg-white cursor-pointer hover:bg-[#EAF7F0] font-semibold ';
      return classes;
    }
    
    // Status-based styling
    if (dayAvailability) {
      switch (dayAvailability.status) {
        case 'available':
          classes += 'bg-white border border-[#E2E8E4] text-[#0F172A] cursor-pointer hover:border-[#1DB954] hover:shadow-sm ';
          break;
        case 'partially-booked':
          classes += 'bg-[#EAF7F0] border border-[#E2E8E4] text-[#0F172A] cursor-pointer hover:border-[#1DB954] hover:shadow-sm ';
          break;
        case 'fully-booked':
          classes += 'bg-[#F1F3F2] text-[#9CA3AF] cursor-not-allowed ';
          break;
        default:
          classes += 'bg-white border border-[#E2E8E4] text-[#0F172A] cursor-pointer hover:border-[#1DB954] hover:shadow-sm ';
      }
    } else {
      // Default available state
      classes += 'bg-white border border-[#E2E8E4] text-[#0F172A] cursor-pointer hover:border-[#1DB954] hover:shadow-sm ';
    }
    
    return classes;
  }, [availability, selectedDate, currentDate]);
  
  const handleDateClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    const dayAvailability = availability.get(dateKey);
    
    // Prevent selection of past dates, other months, or fully booked days
    if (isPastDate(date) || !isCurrentMonth(date)) return;
    if (dayAvailability?.status === 'fully-booked') return;
    
    onDateSelect(date);
  };
  
  const handleKeyDown = (event: React.KeyboardEvent, date: Date) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDateClick(date);
    }
  };
  
  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onMonthChange('prev')}
          disabled={isLoading}
          className="p-2 rounded-lg border border-[#E2E8E4] bg-white text-[#0F172A] hover:border-[#1DB954] hover:bg-[#F7F9F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-xl sm:text-2xl font-semibold text-[#0F172A]">
          {monthName} {year}
        </h2>
        
        <button
          onClick={() => onMonthChange('next')}
          disabled={isLoading}
          className="p-2 rounded-lg border border-[#E2E8E4] bg-white text-[#0F172A] hover:border-[#1DB954] hover:bg-[#F7F9F8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-[#E2E8E4] p-4 sm:p-6">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <div
              key={day}
              className="text-center text-sm font-medium text-[#6B7280] py-2"
            >
              {getDayOfWeekShort(day)}
            </div>
          ))}
        </div>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="relative">
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="w-8 h-8 border-3 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}
        
        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            const dateKey = formatDateKey(date);
            const dayAvailability = availability.get(dateKey);
            const isPast = isPastDate(date);
            const isOtherMonth = !isCurrentMonth(date);
            const canSelect = !isPast && !isOtherMonth && dayAvailability?.status !== 'fully-booked';
            
            return (
              <button
                key={`${dateKey}-${index}`}
                onClick={() => handleDateClick(date)}
                onKeyDown={(e) => handleKeyDown(e, date)}
                disabled={!canSelect}
                className={getDayClasses(date)}
                aria-label={`${date.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}${dayAvailability?.status === 'partially-booked' ? ', Partially booked' : ''}${dayAvailability?.status === 'fully-booked' ? ', Fully booked' : ''}`}
                aria-pressed={isSameDay(date, selectedDate)}
                tabIndex={canSelect ? 0 : -1}
              >
                <span className="text-base sm:text-lg">
                  {date.getDate()}
                </span>
                
                {/* Availability indicator dot for partially booked days */}
                {dayAvailability?.status === 'partially-booked' && !isSameDay(date, selectedDate) && (
                  <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#1DB954] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm text-[#6B7280]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#1DB954] rounded" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#EAF7F0] border border-[#E2E8E4] rounded" />
          <span>Partially booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#F1F3F2] rounded" />
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  );
};
