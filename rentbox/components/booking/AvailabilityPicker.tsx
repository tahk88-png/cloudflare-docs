'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, AlertCircle } from 'lucide-react'
import { format, addHours, startOfHour, isAfter, isBefore, addDays } from 'date-fns'

interface AvailabilityPickerProps {
  productId: string
  onTimeSelect: (start: Date, end: Date) => void
  priceUnit: 'hour' | 'day'
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}))

const DURATION_OPTIONS = [
  { hours: 1, label: '1 tund' },
  { hours: 3, label: '3 tundi' },
  { hours: 6, label: '6 tundi' },
  { hours: 24, label: '1 päev' },
  { hours: 48, label: '2 päeva' },
  { hours: 72, label: '3 päeva' },
]

export function AvailabilityPicker({ productId, onTimeSelect, priceUnit }: AvailabilityPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(priceUnit === 'hour' ? 3 : 24)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const startDate = selectedDate && selectedHour !== null
    ? new Date(selectedDate.setHours(selectedHour, 0, 0, 0))
    : null

  const endDate = startDate
    ? addHours(startDate, selectedDuration)
    : null

  useEffect(() => {
    if (startDate && endDate) {
      checkAndNotify(startDate, endDate)
    }
  }, [startDate, endDate])

  const checkAndNotify = async (start: Date, end: Date) => {
    setIsCheckingAvailability(true)
    setAvailabilityError(null)

    try {
      const response = await fetch(
        `/api/products/${productId}/availability?startAt=${start.toISOString()}&endAt=${end.toISOString()}`
      )

      const data = await response.json()

      if (data.isAvailable) {
        onTimeSelect(start, end)
      } else {
        setAvailabilityError(
          data.nextAvailable
            ? `Valitud aeg pole saadaval. Järgmine vaba aeg: ${format(new Date(data.nextAvailable.startAt), 'dd.MM HH:mm')}`
            : 'Valitud aeg pole saadaval'
        )
      }
    } catch (error) {
      setAvailabilityError('Saadavuse kontrollimisel tekkis viga')
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const minDate = new Date()
  const maxDate = addDays(new Date(), 30)

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <h3 className="text-sm font-medium mb-3 text-neutral-300">Vali kuupäev</h3>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => isBefore(date, minDate) || isAfter(date, maxDate)}
            className="mx-auto"
          />
        </div>
      </div>

      {/* Duration Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-neutral-300">Vali kestus</h3>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <Button
                key={option.hours}
                variant={selectedDuration === option.hours ? 'default' : 'outline'}
                onClick={() => setSelectedDuration(option.hours)}
                className="w-full"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Hour Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-neutral-300">
            Vali algusaeg
          </h3>
          <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
            {TIME_SLOTS.map((slot) => {
              const slotTime = new Date(selectedDate)
              slotTime.setHours(slot.hour, 0, 0, 0)
              const isPast = isBefore(slotTime, new Date())

              return (
                <Button
                  key={slot.hour}
                  variant={selectedHour === slot.hour ? 'default' : 'outline'}
                  onClick={() => setSelectedHour(slot.hour)}
                  disabled={isPast}
                  className="w-full"
                >
                  {slot.label}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Availability Status */}
      {startDate && endDate && (
        <Card className="p-4 bg-neutral-900/50 border-neutral-800">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-200">
                  {format(startDate, 'dd.MM.yyyy HH:mm')} - {format(endDate, 'dd.MM.yyyy HH:mm')}
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Kestus: {selectedDuration < 24 ? `${selectedDuration}h` : `${selectedDuration / 24} päeva`}
                </div>
              </div>
            </div>

            {isCheckingAvailability && (
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                Kontrollin saadavust...
              </div>
            )}

            {availabilityError && (
              <div className="flex items-start gap-2 text-sm text-orange-400 bg-orange-400/10 rounded p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{availabilityError}</span>
              </div>
            )}

            {!isCheckingAvailability && !availabilityError && (
              <Badge variant="success" className="w-full justify-center py-2">
                ✓ Saadaval
              </Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
