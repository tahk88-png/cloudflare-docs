// Prisma-ready data access functions
// Replace mock implementations in data.ts with these when Prisma is configured

import type { PrismaClient } from '@prisma/client'
import type { Booking, Compartment, AvailabilityCheck } from './data'

// Uncomment and use when Prisma is configured:
/*
export async function getBookingsForProductPrisma(
  prisma: PrismaClient,
  productId: string,
  startDate: Date,
  endDate: Date
): Promise<Booking[]> {
  return await prisma.booking.findMany({
    where: {
      productId,
      status: { in: ['pending', 'confirmed'] },
      OR: [
        { startsAt: { lte: endDate }, endsAt: { gte: startDate } }
      ]
    },
    orderBy: { startsAt: 'asc' }
  })
}

export async function getAvailableCompartmentsPrisma(
  prisma: PrismaClient,
  productId: string,
  startDate: Date,
  endDate: Date
): Promise<Compartment[]> {
  return await prisma.compartment.findMany({
    where: {
      productId,
      active: true,
      bookings: {
        none: {
          status: { in: ['pending', 'confirmed'] },
          OR: [
            { startsAt: { lt: endDate }, endsAt: { gt: startDate } }
          ]
        }
      }
    },
    include: { locker: true }
  })
}

export async function checkAvailabilityPrisma(
  prisma: PrismaClient,
  productId: string,
  compartmentId: string,
  startsAt: Date,
  endsAt: Date
): Promise<AvailabilityCheck> {
  // Check for overlapping bookings using overlap rule: a.start < b.end AND a.end > b.start
  const conflicting = await prisma.booking.findFirst({
    where: {
      compartmentId,
      status: { in: ['pending', 'confirmed'] },
      AND: [
        { startsAt: { lt: endsAt } },
        { endsAt: { gt: startsAt } }
      ]
    }
  })
  
  if (conflicting) {
    return { available: false, conflictingBookings: [conflicting] }
  }
  
  const compartment = await prisma.compartment.findUnique({
    where: { id: compartmentId },
    include: { product: true, locker: true }
  })
  
  if (!compartment || !compartment.active) {
    return { available: false }
  }
  
  if (compartment.productId !== productId) {
    return { available: false }
  }
  
  return { available: true, availableCompartments: [compartment] }
}

export async function createBookingPrisma(
  prisma: PrismaClient,
  productId: string,
  compartmentId: string,
  startsAt: Date,
  endsAt: Date
): Promise<Booking> {
  // Validate availability first
  const availability = await checkAvailabilityPrisma(prisma, productId, compartmentId, startsAt, endsAt)
  
  if (!availability.available) {
    throw new Error('Booking slot not available')
  }
  
  // Create booking with transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Double-check availability within transaction
    const stillAvailable = await checkAvailabilityPrisma(tx as PrismaClient, productId, compartmentId, startsAt, endsAt)
    
    if (!stillAvailable.available) {
      throw new Error('Booking slot no longer available')
    }
    
    return await tx.booking.create({
      data: {
        productId,
        compartmentId,
        startsAt,
        endsAt,
        status: 'pending'
      }
    })
  })
}
*/
