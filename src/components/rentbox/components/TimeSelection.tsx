import React, { useMemo } from 'react';
import type { TimeSelectionProps, TimeSlot } from '../types/booking';
import { calculateDuration, isTimeAfter, formatTimeDisplay } from '../utils/dateUtils';

/**
 * TimeSelection - Start and end time picker with 15-minute slots
 * Follows Rentbox brand guidelines
 */
export const TimeSelection: React.FC<TimeSelectionProps> = ({
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  availableSlots,
  onStartTimeSelect,
  onEndTimeSelect,
  minDuration,
  maxDuration,
  slotInterval,
}) => {
  const isSelectingStartTime = !selectedStartTime;
  const isSelectingEndTime = selectedStartTime && !selectedEndTime;
  
  // Filter slots based on current selection
  const { startTimeSlots, endTimeSlots } = useMemo(() => {
    const start: TimeSlot[] = [];
    const end: TimeSlot[] = [];
    
    availableSlots.forEach(slot => {
      // Start time slots - all available slots
      if (!selectedStartTime) {
        start.push(slot);
      }
      
      // End time slots - must be after start time and within duration limits
      if (selectedStartTime && isTimeAfter(slot.time, selectedStartTime)) {
        const duration = calculateDuration(selectedStartTime, slot.time);
        if (duration >= minDuration && duration <= maxDuration && slot.available) {
          end.push(slot);
        }
      }
    });
    
    return { startTimeSlots: start, endTimeSlots: end };
  }, [availableSlots, selectedStartTime, minDuration, maxDuration]);
  
  const getSlotClasses = (time: string, isSelected: boolean, isAvailable: boolean): string => {
    let classes = 'px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ';
    classes += 'focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2 ';
    classes += 'min-w-[80px] ';
    
    if (!isAvailable) {
      classes += 'bg-[#F1F3F2] text-[#9CA3AF] cursor-not-allowed border border-transparent ';
    } else if (isSelected) {
      classes += 'bg-[#1DB954] text-white cursor-pointer shadow-md border border-[#1DB954] ';
    } else {
      classes += 'bg-white text-[#0F172A] cursor-pointer border border-[#E2E8E4] hover:border-[#1DB954] hover:shadow-sm ';
    }
    
    return classes;
  };
  
  const handleStartTimeClick = (time: string, available: boolean) => {
    if (!available) return;
    onStartTimeSelect(time);
  };
  
  const handleEndTimeClick = (time: string) => {
    onEndTimeSelect(time);
  };
  
  const handleKeyDown = (
    event: React.KeyboardEvent,
    time: string,
    handler: (time: string) => void,
    available: boolean
  ) => {
    if (!available) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(time);
    }
  };
  
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  
  const currentDuration = selectedStartTime && selectedEndTime 
    ? calculateDuration(selectedStartTime, selectedEndTime)
    : null;
  
  return (
    <div className="w-full space-y-6">
      {/* Header with selected date */}
      <div className="bg-white rounded-xl border border-[#E2E8E4] p-4">
        <h3 className="text-lg font-semibold text-[#0F172A] mb-1">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h3>
        {selectedStartTime && (
          <p className="text-sm text-[#6B7280]">
            {isSelectingEndTime ? (
              <>Starting at {formatTimeDisplay(selectedStartTime)}</>
            ) : (
              <>
                {formatTimeDisplay(selectedStartTime)} - {formatTimeDisplay(selectedEndTime!)}
                {currentDuration && (
                  <span className="ml-2 text-[#1DB954] font-medium">
                    ({formatDuration(currentDuration)})
                  </span>
                )}
              </>
            )}
          </p>
        )}
      </div>
      
      {/* Start Time Selection */}
      {isSelectingStartTime && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold text-[#0F172A]">
              Select start time
            </h4>
            <span className="text-sm text-[#6B7280]">
              {startTimeSlots.filter(s => s.available).length} slots available
            </span>
          </div>
          
          <div className="bg-white rounded-xl border border-[#E2E8E4] p-4 max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {startTimeSlots.map(slot => (
                <button
                  key={slot.time}
                  onClick={() => handleStartTimeClick(slot.time, slot.available)}
                  onKeyDown={(e) => handleKeyDown(e, slot.time, onStartTimeSelect, slot.available)}
                  disabled={!slot.available}
                  className={getSlotClasses(slot.time, false, slot.available)}
                  aria-label={`Start time ${formatTimeDisplay(slot.time)}${!slot.available ? ', unavailable' : ''}`}
                  tabIndex={slot.available ? 0 : -1}
                >
                  {formatTimeDisplay(slot.time)}
                </button>
              ))}
            </div>
            
            {startTimeSlots.filter(s => s.available).length === 0 && (
              <div className="text-center py-8 text-[#6B7280]">
                No available time slots for this date
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* End Time Selection */}
      {isSelectingEndTime && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold text-[#0F172A]">
              Select end time
            </h4>
            <button
              onClick={() => onStartTimeSelect('')}
              className="text-sm text-[#1DB954] hover:text-[#159A46] font-medium focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:ring-offset-2 rounded px-2 py-1"
            >
              Change start time
            </button>
          </div>
          
          <div className="bg-white rounded-xl border border-[#E2E8E4] p-4 max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {endTimeSlots.map(slot => (
                <button
                  key={slot.time}
                  onClick={() => handleEndTimeClick(slot.time)}
                  onKeyDown={(e) => handleKeyDown(e, slot.time, onEndTimeSelect, true)}
                  className={getSlotClasses(slot.time, slot.time === selectedEndTime, true)}
                  aria-label={`End time ${formatTimeDisplay(slot.time)}, duration ${formatDuration(calculateDuration(selectedStartTime!, slot.time))}`}
                  tabIndex={0}
                >
                  <div className="flex flex-col items-center">
                    <span>{formatTimeDisplay(slot.time)}</span>
                    <span className="text-xs mt-1 opacity-75">
                      {formatDuration(calculateDuration(selectedStartTime!, slot.time))}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            {endTimeSlots.length === 0 && (
              <div className="text-center py-8 text-[#6B7280]">
                No valid end times available.<br />
                <span className="text-sm">
                  Minimum duration: {formatDuration(minDuration)}
                </span>
              </div>
            )}
          </div>
          
          {/* Duration info */}
          <div className="mt-4 p-4 bg-[#F7F9F8] rounded-lg border border-[#E2E8E4]">
            <div className="flex items-start gap-2 text-sm text-[#6B7280]">
              <svg className="w-5 h-5 text-[#1DB954] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-[#0F172A]">Booking duration</p>
                <p>Min: {formatDuration(minDuration)} • Max: {formatDuration(maxDuration)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
