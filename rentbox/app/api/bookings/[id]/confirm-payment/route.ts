import { NextRequest, NextResponse } from 'next/server'
import { confirmBookingPayment } from '@/lib/api/bookings'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { paymentIntentId, paymentMethod } = body

    if (!paymentIntentId || !paymentMethod) {
      return NextResponse.json(
        { error: 'paymentIntentId and paymentMethod required' },
        { status: 400 }
      )
    }

    const booking = await confirmBookingPayment(
      params.id,
      paymentIntentId,
      paymentMethod
    )

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        accessCode: booking.accessCode,
        instructions: booking.instructions,
        productName: booking.product.name,
        startAt: booking.startAt,
        endAt: booking.endAt,
        locker: {
          name: booking.compartment.locker.name,
          locationText: booking.compartment.locker.locationText,
        },
      },
    })
  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
