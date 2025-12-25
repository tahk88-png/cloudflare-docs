// Booking data access layer
import type { Product, Compartment, Locker } from '@/lib/catalog/data'

export interface Booking {
  id: string
  productId: string
  compartmentId: string
  startsAt: Date
  endsAt: Date
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: Date
  updatedAt: Date
}

export interface BookingSlot {
  start: Date
  end: Date
  available: boolean
  compartmentId?: string
}

export interface AvailabilityCheck {
  available: boolean
  conflictingBookings?: Booking[]
  availableCompartments?: Compartment[]
}

// Mock data - replace with Prisma queries
const mockBookings: Booking[] = []

export async function getBookingsForProduct(
  productId: string,
  startDate: Date,
  endDate: Date
): Promise<Booking[]> {
  // TODO: Replace with Prisma query
  // return await prisma.booking.findMany({
  //   where: {
  //     productId,
  //     status: { in: ['pending', 'confirmed'] },
  //     OR: [
  //       { startsAt: { lte: endDate }, endsAt: { gte: startDate } }
  //     ]
  //   },
  //   orderBy: { startsAt: 'asc' }
  // })
  
  return mockBookings.filter(b => 
    b.productId === productId &&
    b.status !== 'cancelled' &&
    b.startsAt < endDate &&
    b.endsAt > startDate
  )
}

export async function getAvailableCompartments(
  productId: string,
  startDate: Date,
  endDate: Date
): Promise<Compartment[]> {
  // TODO: Replace with Prisma query
  // Get active compartments for product
  // Check which ones don't have conflicting bookings
  // return await prisma.compartment.findMany({
  //   where: {
  //     productId,
  //     active: true,
  //     bookings: {
  //       none: {
  //         status: { in: ['pending', 'confirmed'] },
  //         OR: [
  //           { startsAt: { lte: endDate }, endsAt: { gte: startDate } }
  //         ]
  //       }
  //     }
  //   },
  //   include: { locker: true }
  // })
  
  // Mock: return empty array for now
  return []
}

export async function checkAvailability(
  productId: string,
  compartmentId: string,
  startsAt: Date,
  endsAt: Date
): Promise<AvailabilityCheck> {
  // TODO: Replace with Prisma query
  // Check for overlapping bookings
  // const conflicting = await prisma.booking.findFirst({
  //   where: {
  //     compartmentId,
  //     status: { in: ['pending', 'confirmed'] },
  //     OR: [
  //       { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }
  //     ]
  //   }
  // })
  
  // if (conflicting) {
  //   return { available: false, conflictingBookings: [conflicting] }
  // }
  
  // const compartment = await prisma.compartment.findUnique({
  //   where: { id: compartmentId },
  //   include: { product: true }
  // })
  
  // if (!compartment || !compartment.active) {
  //   return { available: false }
  // }
  
  return { available: true }
}

export async function createBooking(
  productId: string,
  compartmentId: string,
  startsAt: Date,
  endsAt: Date
): Promise<Booking> {
  // TODO: Replace with Prisma query
  // Validate availability first
  // const availability = await checkAvailability(productId, compartmentId, startsAt, endsAt)
  // if (!availability.available) {
  //   throw new Error('Booking slot not available')
  // }
  
  // return await prisma.booking.create({
  //   data: {
  //     productId,
  //     compartmentId,
  //     startsAt,
  //     endsAt,
  //     status: 'pending'
  //   }
  // })
  
  const booking: Booking = {
    id: `booking-${Date.now()}`,
    productId,
    compartmentId,
    startsAt,
    endsAt,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  mockBookings.push(booking)
  return booking
}

export function generateTimeSlots(date: Date, timezone: string = 'Europe/Tallinn'): Date[] {
  const slots: Date[] = []
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  // Generate 15-minute slots from 00:00 to 23:45
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slot = new Date(startOfDay)
      slot.setHours(hour, minute, 0, 0)
      slots.push(slot)
    }
  }
  
  return slots
}

export function isSlotAvailable(
  slot: Date,
  durationMinutes: number,
  bookings: Booking[],
  compartments: Compartment[]
): boolean {
  const slotEnd = new Date(slot.getTime() + durationMinutes * 60 * 1000)
  const now = new Date()
  
  // Can't book in the past
  if (slot < now) return false
  
  // Check if any compartment is available for this slot
  for (const compartment of compartments) {
    const hasConflict = bookings.some(booking => {
      if (booking.compartmentId !== compartment.id) return false
      return slot < booking.endsAt && slotEnd > booking.startsAt
    })
    
    if (!hasConflict) {
      return true
    }
  }
  
  return false
}
