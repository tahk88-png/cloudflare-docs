import { NextRequest, NextResponse } from 'next/server'
import { getBooking } from '@/lib/api/bookings'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await getBooking(params.id)

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: booking.id,
      productName: booking.product.name,
      productSlug: booking.product.slug,
      startAt: booking.startAt,
      endAt: booking.endAt,
      totalPrice: booking.totalPrice,
      currency: booking.currency,
      status: booking.status,
      userEmail: booking.userEmail,
      userName: booking.userName,
      accessCode: booking.accessCode,
      instructions: booking.instructions,
      locker: {
        name: booking.compartment.locker.name,
        locationText: booking.compartment.locker.locationText,
      },
      compartment: {
        label: booking.compartment.label,
      },
      createdAt: booking.createdAt,
      paidAt: booking.paidAt,
    })
  } catch (error) {
    console.error('Get booking error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    )
  }
}
