/**
 * Rentbox Booking Calendar - Type Definitions
 * Timezone: Europe/Tallinn (UI uses local time, storage uses UTC)
 */

export type BookingStatus = 'available' | 'partially-booked' | 'fully-booked' | 'past';

export interface TimeSlot {
  time: string; // Format: "HH:mm" (e.g., "09:00")
  available: boolean;
  compartmentsAvailable?: number; // For partially booked days
  totalCompartments?: number;
}

export interface DayAvailability {
  date: Date;
  status: BookingStatus;
  availableSlots: TimeSlot[];
  compartmentsAvailable?: number;
  totalCompartments?: number;
}

export interface BookingSelection {
  date: Date | null;
  startTime: string | null;
  endTime: string | null;
}

export interface BookingCalendarProps {
  /**
   * Callback when booking is confirmed
   * @param booking - The complete booking selection with date and time range
   */
  onBookingConfirm: (booking: Required<BookingSelection>) => void | Promise<void>;
  
  /**
   * Function to fetch availability data for a given month
   * @param year - Year (e.g., 2025)
   * @param month - Month (1-12)
   * @returns Array of day availability data
   */
  fetchAvailability: (year: number, month: number) => Promise<DayAvailability[]>;
  
  /**
   * Minimum booking duration in minutes (default: 60)
   */
  minBookingDuration?: number;
  
  /**
   * Maximum booking duration in minutes (default: 1440 = 24 hours)
   */
  maxBookingDuration?: number;
  
  /**
   * Business hours start time (default: "00:00" for 24/7)
   */
  businessHoursStart?: string;
  
  /**
   * Business hours end time (default: "23:45" for 24/7)
   */
  businessHoursEnd?: string;
  
  /**
   * Slot interval in minutes (default: 15)
   */
  slotInterval?: number;
  
  /**
   * Optional loading state
   */
  isLoading?: boolean;
  
  /**
   * Optional error message
   */
  error?: string | null;
  
  /**
   * Callback when selection changes (for tracking/analytics)
   */
  onSelectionChange?: (selection: BookingSelection) => void;
}

export interface CalendarViewProps {
  currentDate: Date;
  selectedDate: Date | null;
  availability: Map<string, DayAvailability>;
  onDateSelect: (date: Date) => void;
  onMonthChange: (direction: 'prev' | 'next') => void;
  isLoading?: boolean;
}

export interface TimeSelectionProps {
  selectedDate: Date;
  selectedStartTime: string | null;
  selectedEndTime: string | null;
  availableSlots: TimeSlot[];
  onStartTimeSelect: (time: string) => void;
  onEndTimeSelect: (time: string) => void;
  minDuration: number;
  maxDuration: number;
  slotInterval: number;
}

export interface BookingState {
  step: 'date' | 'start-time' | 'end-time' | 'confirm';
  selection: BookingSelection;
  availability: Map<string, DayAvailability>;
  currentMonth: Date;
  isLoading: boolean;
  error: string | null;
}
