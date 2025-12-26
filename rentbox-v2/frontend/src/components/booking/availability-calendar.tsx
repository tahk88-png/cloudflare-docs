'use client';

import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';
import { et } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CalendarDay } from '@/types';

interface AvailabilityCalendarProps {
  productId: string;
  locationId: string;
  calendarData?: CalendarDay[];
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  isLoading?: boolean;
}

/**
 * AvailabilityCalendar Component
 * 
 * Displays monthly availability for a product at a location.
 * Color-coded days indicate availability status.
 * Clicking a day triggers the time slot selector.
 */
export function AvailabilityCalendar({
  productId,
  locationId,
  calendarData = [],
  selectedDate,
  onDateSelect,
  isLoading = false,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Create a map for quick lookup
  const availabilityMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    calendarData.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [calendarData]);

  const getAvailabilityClass = (date: Date): string => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const availability = availabilityMap.get(dateStr);
    
    if (!availability || !availability.isOperating) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }

    switch (availability.availability) {
      case 'FULL':
        return 'bg-green-100 hover:bg-green-200 text-green-800 cursor-pointer';
      case 'PARTIAL':
        return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 cursor-pointer';
      case 'NONE':
        return 'bg-red-100 text-red-400 cursor-not-allowed';
      default:
        return 'bg-gray-100 text-gray-400';
    }
  };

  const isSelectable = (date: Date): boolean => {
    if (isBefore(startOfDay(date), startOfDay(new Date()))) {
      return false;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    const availability = availabilityMap.get(dateStr);
    return availability?.isOperating && availability?.availability !== 'NONE';
  };

  const handleDateClick = (date: Date) => {
    if (isSelectable(date)) {
      onDateSelect(date);
    }
  };

  const weekDays = ['E', 'T', 'K', 'N', 'R', 'L', 'P']; // Estonian weekday abbreviations

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={isBefore(startOfMonth(currentMonth), startOfMonth(new Date()))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy', { locale: et })}
        </h3>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && (
        <>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {/* Day cells */}
            {days.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const availability = availabilityMap.get(dateStr);
              const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;
              const isPast = isBefore(startOfDay(date), startOfDay(new Date()));

              return (
                <TooltipProvider key={dateStr}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDateClick(date)}
                        disabled={!isSelectable(date)}
                        className={cn(
                          'relative p-2 text-center rounded-md transition-colors',
                          getAvailabilityClass(date),
                          isSelected && 'ring-2 ring-primary ring-offset-2',
                          isToday(date) && 'font-bold',
                          isPast && 'opacity-50'
                        )}
                      >
                        <span className="text-sm">{format(date, 'd')}</span>
                        
                        {/* Availability indicator dot */}
                        {availability?.availability === 'PARTIAL' && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow-500" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isPast ? (
                        <p>Minevik</p>
                      ) : !availability?.isOperating ? (
                        <p>Suletud</p>
                      ) : availability?.availability === 'FULL' ? (
                        <p>Saadaval kogu päev</p>
                      ) : availability?.availability === 'PARTIAL' ? (
                        <p>Osaliselt saadaval</p>
                      ) : (
                        <p>Täielikult broneeritud</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-100 border border-green-200" />
          <span className="text-gray-600">Saadaval</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200" />
          <span className="text-gray-600">Osaliselt</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-100 border border-red-200" />
          <span className="text-gray-600">Broneeritud</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
          <span className="text-gray-600">Suletud</span>
        </div>
      </div>
    </div>
  );
}
