'use client';

import { useState, useMemo } from 'react';
import { format, addHours, setHours, setMinutes, isBefore, isAfter } from 'date-fns';
import { et } from 'date-fns/locale';
import { Clock, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TimeSlot, BookingPricing } from '@/types';

interface TimeSlotSelectorProps {
  selectedDate: Date;
  availableSlots: TimeSlot[];
  bookedSlots?: TimeSlot[];
  operatingHours?: { open: string; close: string };
  minRentalHours: number;
  maxRentalDays: number;
  pricing: {
    hourly: string;
    daily: string;
  };
  onSlotSelect: (startAt: Date, endAt: Date) => void;
  isLoading?: boolean;
}

// Predefined duration options
const DURATION_OPTIONS = [
  { value: 1, label: '1 tund', type: 'hour' },
  { value: 2, label: '2 tundi', type: 'hour' },
  { value: 4, label: '4 tundi', type: 'hour' },
  { value: 8, label: '8 tundi (tööpäev)', type: 'hour' },
  { value: 24, label: '1 päev', type: 'day' },
  { value: 48, label: '2 päeva', type: 'day' },
  { value: 168, label: '1 nädal', type: 'week' },
] as const;

/**
 * TimeSlotSelector Component
 * 
 * Allows users to select start time and duration for their booking.
 * Shows real-time pricing calculation.
 * Validates against available slots.
 */
export function TimeSlotSelector({
  selectedDate,
  availableSlots,
  bookedSlots = [],
  operatingHours,
  minRentalHours,
  maxRentalDays,
  pricing,
  onSlotSelect,
  isLoading = false,
}: TimeSlotSelectorProps) {
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(4); // Default 4 hours

  // Generate available start times based on operating hours and availability
  const startTimeOptions = useMemo(() => {
    if (!operatingHours) return [];

    const [openHour, openMinute = 0] = operatingHours.open.split(':').map(Number);
    const [closeHour, closeMinute = 0] = operatingHours.close.split(':').map(Number);

    const options: { time: string; available: boolean }[] = [];
    
    for (let hour = openHour; hour < closeHour; hour++) {
      for (const minute of [0, 30]) {
        if (hour === openHour && minute < openMinute) continue;
        if (hour === closeHour - 1 && minute > closeMinute) continue;

        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const dateTime = setMinutes(setHours(selectedDate, hour), minute);
        
        // Check if this time slot is in the past
        if (isBefore(dateTime, new Date())) {
          options.push({ time: timeStr, available: false });
          continue;
        }

        // Check if slot conflicts with any booking
        const hasConflict = bookedSlots.some((slot) => {
          const slotStart = new Date(slot.start);
          const slotEnd = new Date(slot.end);
          return isAfter(dateTime, slotStart) && isBefore(dateTime, slotEnd);
        });

        options.push({ time: timeStr, available: !hasConflict });
      }
    }

    return options;
  }, [selectedDate, operatingHours, bookedSlots]);

  // Calculate end time and validate
  const calculatedEndTime = useMemo(() => {
    if (!selectedStartTime) return null;

    const [hour, minute] = selectedStartTime.split(':').map(Number);
    const startDateTime = setMinutes(setHours(selectedDate, hour), minute);
    const endDateTime = addHours(startDateTime, selectedDuration);

    return {
      startAt: startDateTime,
      endAt: endDateTime,
      formatted: format(endDateTime, 'HH:mm'),
    };
  }, [selectedDate, selectedStartTime, selectedDuration]);

  // Validate the selected slot doesn't conflict
  const validation = useMemo(() => {
    if (!calculatedEndTime) return { valid: false, message: 'Valige algusaeg' };

    const { startAt, endAt } = calculatedEndTime;

    // Check operating hours
    if (operatingHours) {
      const [closeHour, closeMinute = 0] = operatingHours.close.split(':').map(Number);
      const closingTime = setMinutes(setHours(selectedDate, closeHour), closeMinute);
      
      if (isAfter(endAt, closingTime)) {
        return { 
          valid: false, 
          message: `Lõpuaeg ületab lahtiolekuaegu (${operatingHours.close})` 
        };
      }
    }

    // Check for conflicts with bookings
    const hasConflict = bookedSlots.some((slot) => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      return (
        (isAfter(startAt, slotStart) && isBefore(startAt, slotEnd)) ||
        (isAfter(endAt, slotStart) && isBefore(endAt, slotEnd)) ||
        (isBefore(startAt, slotStart) && isAfter(endAt, slotEnd))
      );
    });

    if (hasConflict) {
      return { valid: false, message: 'Valitud ajavahemik kattub olemasoleva broneeringuga' };
    }

    return { valid: true, message: null };
  }, [calculatedEndTime, operatingHours, bookedSlots, selectedDate]);

  // Calculate price
  const calculatedPrice = useMemo(() => {
    const hours = selectedDuration;
    const days = Math.ceil(hours / 24);

    const hourlyTotal = hours * parseFloat(pricing.hourly);
    const dailyTotal = days * parseFloat(pricing.daily);

    // Use cheaper option
    const subtotal = Math.min(hourlyTotal, dailyTotal);
    const method = hourlyTotal <= dailyTotal ? 'hourly' : 'daily';

    return {
      subtotal: subtotal.toFixed(2),
      method,
      methodLabel: method === 'hourly' ? `${hours}h × €${pricing.hourly}` : `${days}d × €${pricing.daily}`,
    };
  }, [selectedDuration, pricing]);

  const handleConfirm = () => {
    if (validation.valid && calculatedEndTime) {
      onSlotSelect(calculatedEndTime.startAt, calculatedEndTime.endAt);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">
          {format(selectedDate, 'EEEE, d. MMMM', { locale: et })}
        </h3>
        {operatingHours && (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Avatud {operatingHours.open} - {operatingHours.close}
          </p>
        )}
      </div>

      {/* Start Time Selection */}
      <div className="space-y-2">
        <Label>Algusaeg</Label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {startTimeOptions.map(({ time, available }) => (
            <Button
              key={time}
              variant={selectedStartTime === time ? 'default' : 'outline'}
              size="sm"
              disabled={!available}
              onClick={() => setSelectedStartTime(time)}
              className={cn(
                'text-sm',
                !available && 'opacity-50 cursor-not-allowed line-through'
              )}
            >
              {time}
            </Button>
          ))}
        </div>
      </div>

      {/* Duration Selection */}
      <div className="space-y-2">
        <Label>Kestus</Label>
        <Select
          value={selectedDuration.toString()}
          onValueChange={(v) => setSelectedDuration(parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Valige kestus" />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.filter((opt) => {
              const hours = opt.value;
              const days = hours / 24;
              return hours >= minRentalHours && days <= maxRentalDays;
            }).map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {selectedStartTime && calculatedEndTime && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Algus:</span>
            <span className="font-medium">{selectedStartTime}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Lõpp:</span>
            <span className="font-medium">{calculatedEndTime.formatted}</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="text-gray-600">Hind:</span>
            <div className="text-right">
              <span className="font-bold text-lg">€{calculatedPrice.subtotal}</span>
              <p className="text-xs text-gray-500">{calculatedPrice.methodLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {!validation.valid && validation.message && selectedStartTime && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validation.message}</AlertDescription>
        </Alert>
      )}

      {/* Confirm Button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!validation.valid || isLoading}
        onClick={handleConfirm}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Kontrollimine...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Jätka broneerimisega
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </Button>
    </div>
  );
}
