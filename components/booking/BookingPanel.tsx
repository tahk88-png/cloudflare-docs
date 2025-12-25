"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isPast } from 'date-fns'
// @ts-ignore - date-fns locale may not have types
import { et } from 'date-fns/locale/et' || {}
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product, Compartment, Locker } from '@/lib/catalog/data'
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking/data'
import { trackEvent } from '@/lib/analytics'

interface BookingPanelProps {
  product: Product
  compartments: Compartment[]
  lockers: Locker[]
  existingBookings?: Array<{
    id: string
    compartmentId: string
    startsAt: Date
    endsAt: Date
  }>
}

export function BookingPanel({ product, compartments, lockers, existingBookings = [] }: BookingPanelProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null)
  const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null)
  const [selectedCompartment, setSelectedCompartment] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  // Filter active compartments
  const activeCompartments = useMemo(() => {
    return compartments.filter(c => c.active)
  }, [compartments])
  
  // If multiple compartments, require selection
  const needsCompartmentSelection = activeCompartments.length > 1
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])
  
  // Generate time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return []
    return generateTimeSlots(selectedDate, 'Europe/Tallinn')
  }, [selectedDate])
  
  // Filter available start times (not in past, not fully booked)
  const availableStartSlots = useMemo(() => {
    if (!selectedDate || activeCompartments.length === 0) return []
    
    const now = new Date()
    return timeSlots.filter(slot => {
      if (slot < now) return false
      
      // Check if at least one compartment is available
      return isSlotAvailable(slot, 60, existingBookings.map(b => ({
        ...b,
        status: 'confirmed' as const
      })), activeCompartments)
    })
  }, [selectedDate, timeSlots, activeCompartments, existingBookings])
  
  // Generate end time options based on selected start time
  const endTimeOptions = useMemo(() => {
    if (!selectedStartTime) return []
    
    const options: Date[] = []
    const start = new Date(selectedStartTime)
    
    // Generate options: +1h, +2h, +4h, +8h, +24h
    const durations = [1, 2, 4, 8, 24]
    
    for (const hours of durations) {
      const endTime = new Date(start.getTime() + hours * 60 * 60 * 1000)
      // Don't allow booking past midnight if spanning days
      if (endTime.getDate() === start.getDate() || hours >= 24) {
        options.push(endTime)
      }
    }
    
    return options
  }, [selectedStartTime])
  
  const handleDateSelect = (date: Date) => {
    if (isPast(date) && !isToday(date)) return
    
    setSelectedDate(date)
    setSelectedStartTime(null)
    setSelectedEndTime(null)
    setError(null)
    trackEvent('booking_date_selected', { product_id: product.id })
  }
  
  const handleStartTimeSelect = (time: Date) => {
    setSelectedStartTime(time)
    setSelectedEndTime(null)
    setError(null)
    trackEvent('booking_start_time_selected', { product_id: product.id })
  }
  
  const handleEndTimeSelect = (time: Date) => {
    setSelectedEndTime(time)
    setError(null)
  }
  
  const handleSubmit = async () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      setError('Palun vali kuupäev, algusaeg ja lõppaeg')
      return
    }
    
    if (needsCompartmentSelection && !selectedCompartment) {
      setError('Palun vali kapp')
      return
    }
    
    const compartmentId = needsCompartmentSelection ? selectedCompartment : activeCompartments[0]?.id
    
    if (!compartmentId) {
      setError('Tööriist pole hetkel saadaval')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Combine date and time
      const startsAt = new Date(selectedDate)
      startsAt.setHours(selectedStartTime.getHours(), selectedStartTime.getMinutes(), 0, 0)
      
      const endsAt = new Date(selectedDate)
      endsAt.setHours(selectedEndTime.getHours(), selectedEndTime.getMinutes(), 0, 0)
      
      // Handle spanning midnight
      if (endsAt < startsAt) {
        endsAt.setDate(endsAt.getDate() + 1)
      }
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          compartmentId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Broneerimine ebaõnnestus')
      }
      
      const booking = await response.json()
      
      trackEvent('booking_confirmed', {
        product_id: product.id,
        booking_id: booking.id,
      })
      
      // Redirect to confirmation page
      router.push(`/broneeringud/${booking.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broneerimine ebaõnnestus')
      setIsSubmitting(false)
    }
  }
  
  // Calculate price
  const calculatePrice = () => {
    if (!selectedStartTime || !selectedEndTime) return 0
    
    const startsAt = new Date(selectedDate!)
    startsAt.setHours(selectedStartTime.getHours(), selectedStartTime.getMinutes(), 0, 0)
    
    const endsAt = new Date(selectedDate!)
    endsAt.setHours(selectedEndTime.getHours(), selectedEndTime.getMinutes(), 0, 0)
    
    if (endsAt < startsAt) {
      endsAt.setDate(endsAt.getDate() + 1)
    }
    
    const durationHours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60)
    
    if (product.priceUnit === 'hour') {
      return Math.ceil(durationHours) * product.basePrice
    } else {
      // Daily pricing: minimum 1 day, then round up
      const days = Math.max(1, Math.ceil(durationHours / 24))
      return days * product.basePrice
    }
  }
  
  const price = calculatePrice()
  
  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-semibold">Broneeri tööriist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Compartment Selection */}
        {needsCompartmentSelection && (
          <div>
            <label className="mb-2 block text-sm font-medium">Vali kapp / asukoht</label>
            <Select
              value={selectedCompartment}
              onChange={(e) => {
                setSelectedCompartment(e.target.value)
                setError(null)
              }}
            >
              <option value="">Vali kapp</option>
              {activeCompartments.map((compartment) => {
                const locker = lockers.find(l => l.id === compartment.lockerId)
                return (
                  <option key={compartment.id} value={compartment.id}>
                    {compartment.label || locker?.locationText || locker?.name || 'Kapp'}
                  </option>
                )
              })}
            </Select>
          </div>
        )}
        
        {/* Calendar */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              ←
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: et })}
            </h3>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              →
            </Button>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {['P', 'E', 'T', 'K', 'N', 'R', 'L'].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-[var(--muted)]">
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isDisabled = isPast(day) && !isToday(day)
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`
                    rounded-lg p-2 text-sm transition-colors
                    ${isSelected 
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' 
                      : isDisabled
                      ? 'text-[var(--disabled)] cursor-not-allowed'
                      : 'hover:bg-[var(--bg)] text-[var(--text)]'
                    }
                    ${isToday(day) && !isSelected ? 'ring-2 ring-[var(--accent)]' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Start Time Selection */}
        {selectedDate && (
          <div>
            <label className="mb-2 block text-sm font-medium">Algusaeg</label>
            <div className="grid grid-cols-4 gap-2">
              {availableStartSlots.slice(0, 16).map((slot) => {
                const isSelected = selectedStartTime && isSameDay(slot, selectedStartTime) && 
                                  slot.getHours() === selectedStartTime.getHours() &&
                                  slot.getMinutes() === selectedStartTime.getMinutes()
                
                return (
                  <button
                    key={slot.toISOString()}
                    onClick={() => handleStartTimeSelect(slot)}
                    className={`
                      rounded-lg border px-3 py-2 text-sm transition-colors
                      ${isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)]'
                      }
                    `}
                  >
                    {format(slot, 'HH:mm')}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* End Time Selection */}
        {selectedStartTime && (
          <div>
            <label className="mb-2 block text-sm font-medium">Lõppaeg</label>
            <div className="grid grid-cols-2 gap-2">
              {endTimeOptions.map((time) => {
                const isSelected = selectedEndTime && 
                                  time.getHours() === selectedEndTime.getHours() &&
                                  time.getMinutes() === selectedEndTime.getMinutes()
                
                const durationHours = (time.getTime() - selectedStartTime.getTime()) / (1000 * 60 * 60)
                const durationText = durationHours < 24 
                  ? `${durationHours}h` 
                  : `${Math.floor(durationHours / 24)}päev`
                
                return (
                  <button
                    key={time.toISOString()}
                    onClick={() => handleEndTimeSelect(time)}
                    className={`
                      rounded-lg border px-4 py-3 text-sm transition-colors
                      ${isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)]'
                      }
                    `}
                  >
                    <div className="font-medium">{format(time, 'HH:mm')}</div>
                    <div className="text-xs text-[var(--muted)]">{durationText}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Price Summary */}
        {price > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Kokku</span>
              <span className="text-2xl font-bold">{price.toFixed(2)}€</span>
            </div>
          </>
        )}
        
        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Submit Button - Sticky on mobile */}
        <div className="sticky bottom-0 bg-[var(--card)] pt-4 pb-2 md:static md:pt-0 md:pb-0">
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedStartTime || !selectedEndTime || isSubmitting || (needsCompartmentSelection && !selectedCompartment)}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Broneerin...' : 'Kinnita broneering'}
          </Button>
          
          <p className="mt-3 text-xs text-[var(--muted)] text-center">
            Võta kapist. Kasuta. Tagasta.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
