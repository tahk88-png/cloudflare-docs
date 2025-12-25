import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type BookingStatus = 'pending' | 'paid' | 'active' | 'completed' | 'cancelled' | 'expired'

export interface AvailabilityCheck {
  productId: string
  startAt: Date
  endAt: Date
}

export interface AvailabilityResult {
  isAvailable: boolean
  availableCompartment?: {
    id: string
    label: string
    lockerName: string
  }
  nextAvailable?: {
    startAt: Date
    endAt: Date
  }
}

export interface BookingQuote {
  productId: string
  startAt: Date
  endAt: Date
}

export interface QuoteResult {
  isAvailable: boolean
  compartmentId?: string
  productName: string
  durationHours: number
  pricePerHour?: number
  pricePerDay?: number
  totalPrice: number
  startAt: Date
  endAt: Date
}

export interface CreateBookingData {
  productId: string
  compartmentId: string
  startAt: Date
  endAt: Date
  userEmail: string
  userName?: string
  userPhone?: string
  totalPrice: number
}

/**
 * Check if product is available for time range
 */
export async function checkAvailability(
  params: AvailabilityCheck
): Promise<AvailabilityResult> {
  const { productId, startAt, endAt } = params

  // Find available compartment
  const availableCompartment = await prisma.$queryRaw<Array<{
    compartment_id: string
    label: string
    locker_name: string
  }>>`
    SELECT c.id as compartment_id, c.label, l.name as locker_name
    FROM compartments c
    JOIN lockers l ON l.id = c."lockerId"
    WHERE c."productId" = ${productId}
      AND c.active = true
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b."compartmentId" = c.id
          AND b.status IN ('pending', 'paid', 'active')
          AND (
            (b."startAt" <= ${startAt} AND b."endAt" > ${startAt})
            OR (b."startAt" < ${endAt} AND b."endAt" >= ${endAt})
            OR (b."startAt" >= ${startAt} AND b."endAt" <= ${endAt})
          )
      )
    LIMIT 1
  `

  if (availableCompartment.length > 0) {
    return {
      isAvailable: true,
      availableCompartment: {
        id: availableCompartment[0].compartment_id,
        label: availableCompartment[0].label,
        lockerName: availableCompartment[0].locker_name,
      },
    }
  }

  // Find next available slot
  const nextSlot = await prisma.$queryRaw<Array<{
    next_available_start: Date
    next_available_end: Date
  }>>`
    WITH available_slot AS (
      SELECT 
        DATE_TRUNC('hour', NOW()) + (n || ' hours')::INTERVAL as slot_start,
        DATE_TRUNC('hour', NOW()) + (n || ' hours')::INTERVAL + INTERVAL '1 hour' as slot_end
      FROM generate_series(0, 720) n
    )
    SELECT 
      a.slot_start as next_available_start,
      a.slot_end as next_available_end
    FROM available_slot a
    WHERE EXISTS (
      SELECT 1 FROM compartments c
      WHERE c."productId" = ${productId}
        AND c.active = true
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b."compartmentId" = c.id
            AND b.status IN ('pending', 'paid', 'active')
            AND (
              (b."startAt" <= a.slot_start AND b."endAt" > a.slot_start)
              OR (b."startAt" < a.slot_end AND b."endAt" >= a.slot_end)
              OR (b."startAt" >= a.slot_start AND b."endAt" <= a.slot_end)
            )
        )
    )
    LIMIT 1
  `

  return {
    isAvailable: false,
    nextAvailable: nextSlot[0] ? {
      startAt: nextSlot[0].next_available_start,
      endAt: nextSlot[0].next_available_end,
    } : undefined,
  }
}

/**
 * Get booking quote with price calculation
 */
export async function getBookingQuote(
  params: BookingQuote
): Promise<QuoteResult> {
  const { productId, startAt, endAt } = params

  // Get product details
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      basePrice: true,
      priceUnit: true,
    },
  })

  if (!product) {
    throw new Error('Product not found')
  }

  // Check availability
  const availability = await checkAvailability({ productId, startAt, endAt })

  if (!availability.isAvailable) {
    return {
      isAvailable: false,
      productName: product.name,
      durationHours: 0,
      totalPrice: 0,
      startAt,
      endAt,
    }
  }

  // Calculate duration and price
  const durationMs = endAt.getTime() - startAt.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)
  const durationDays = durationHours / 24

  let totalPrice: number

  if (product.priceUnit === 'hour') {
    totalPrice = product.basePrice * durationHours
  } else {
    // Day pricing - round up to nearest day
    const days = Math.ceil(durationDays)
    totalPrice = product.basePrice * days
  }

  return {
    isAvailable: true,
    compartmentId: availability.availableCompartment!.id,
    productName: product.name,
    durationHours,
    pricePerHour: product.priceUnit === 'hour' ? product.basePrice : undefined,
    pricePerDay: product.priceUnit === 'day' ? product.basePrice : undefined,
    totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimals
    startAt,
    endAt,
  }
}

/**
 * Create a new booking
 */
export async function createBooking(data: CreateBookingData) {
  const {
    productId,
    compartmentId,
    startAt,
    endAt,
    userEmail,
    userName,
    userPhone,
    totalPrice,
  } = data

  // Validate within transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Check for conflicts
    const conflicts = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE "compartmentId" = ${compartmentId}
        AND status IN ('pending', 'paid', 'active')
        AND (
          ("startAt" <= ${startAt} AND "endAt" > ${startAt})
          OR ("startAt" < ${endAt} AND "endAt" >= ${endAt})
          OR ("startAt" >= ${startAt} AND "endAt" <= ${endAt})
        )
    `

    if (conflicts[0] && Number(conflicts[0].count) > 0) {
      throw new Error('Compartment is no longer available for selected time')
    }

    // Create booking
    const booking = await tx.booking.create({
      data: {
        id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        compartmentId,
        userEmail,
        userName,
        userPhone,
        startAt,
        endAt,
        totalPrice,
        currency: 'EUR',
        status: 'pending',
        accessCode: generateAccessCode(),
      },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
        compartment: {
          include: {
            locker: {
              select: {
                name: true,
                locationText: true,
              },
            },
          },
        },
      },
    })

    return booking
  })
}

/**
 * Confirm payment for booking
 */
export async function confirmBookingPayment(
  bookingId: string,
  paymentIntentId: string,
  paymentMethod: string
) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'paid',
      paymentIntentId,
      paymentMethod,
      paidAt: new Date(),
      instructions: generateBookingInstructions(),
    },
    include: {
      product: true,
      compartment: {
        include: {
          locker: true,
        },
      },
    },
  })

  return booking
}

/**
 * Get booking by ID
 */
export async function getBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      product: true,
      compartment: {
        include: {
          locker: true,
        },
      },
    },
  })

  return booking
}

/**
 * Generate 6-digit access code
 */
function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generate booking instructions
 */
function generateBookingInstructions(): string {
  return `
Teie tööriist on valmis kasutamiseks!

1. Minge nutikapi juurde asukohas, mis on näidatud broneeringus
2. Sisestage juurdepääsukood ekraanile
3. Kapp avaneb automaatselt
4. Võtke tööriist välja ja kasutage
5. Tagastage tööriist samasse kappi enne broneeringu lõppu

Küsimuste korral võtke ühendust: info@rentbox.ee
`.trim()
}
