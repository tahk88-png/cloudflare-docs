import { NextRequest, NextResponse } from 'next/server'
import { createBooking } from '@/lib/api/bookings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      compartmentId,
      startAt,
      endAt,
      userEmail,
      userName,
      userPhone,
      totalPrice,
    } = body

    // Validate required fields
    if (!productId || !compartmentId || !startAt || !endAt || !userEmail || !totalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const startDate = new Date(startAt)
    const endDate = new Date(endAt)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'endAt must be after startAt' },
        { status: 400 }
      )
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Cannot book in the past' },
        { status: 400 }
      )
    }

    if (totalPrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      )
    }

    const booking = await createBooking({
      productId,
      compartmentId,
      startAt: startDate,
      endAt: endDate,
      userEmail,
      userName,
      userPhone,
      totalPrice,
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        productName: booking.product.name,
        startAt: booking.startAt,
        endAt: booking.endAt,
        totalPrice: booking.totalPrice,
        status: booking.status,
        lockerName: booking.compartment.locker.name,
        lockerLocation: booking.compartment.locker.locationText,
      },
    })
  } catch (error) {
    console.error('Booking creation error:', error)
    
    if (error instanceof Error && error.message.includes('not available')) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}
