/**
 * Rentbox Booking Calendar
 * A modern, production-ready booking calendar with time selection
 * 
 * @packageDocumentation
 */

// Main component
export { BookingCalendar } from './components/BookingCalendar';

// Sub-components (for custom implementations)
export { DateCalendar } from './components/DateCalendar';
export { TimeSelection } from './components/TimeSelection';

// Types
export type {
  BookingStatus,
  TimeSlot,
  DayAvailability,
  BookingSelection,
  BookingCalendarProps,
  CalendarViewProps,
  TimeSelectionProps,
  BookingState,
} from './types/booking';

// Utilities
export {
  formatDateKey,
  isToday,
  isPastDate,
  isSameDay,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getCalendarDays,
  getMonthName,
  getYear,
  getPreviousMonth,
  getNextMonth,
  getDayOfWeekShort,
  generateTimeSlots,
  calculateDuration,
  formatTimeDisplay,
  isTimeAfter,
} from './utils/dateUtils';
