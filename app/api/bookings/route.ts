import { NextRequest, NextResponse } from 'next/server'
import { createBooking, checkAvailability } from '@/lib/booking/data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, compartmentId, startsAt, endsAt } = body
    
    // Validate input
    if (!productId || !compartmentId || !startsAt || !endsAt) {
      return NextResponse.json(
        { error: 'Puuduvad nõutud väljad' },
        { status: 400 }
      )
    }
    
    const startDate = new Date(startsAt)
    const endDate = new Date(endsAt)
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Vigased kuupäevad' },
        { status: 400 }
      )
    }
    
    // Can't book in the past
    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Ei saa broneerida minevikku' },
        { status: 400 }
      )
    }
    
    // End must be after start
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'Lõppaeg peab olema pärast algusaega' },
        { status: 400 }
      )
    }
    
    // Check availability
    const availability = await checkAvailability(productId, compartmentId, startDate, endDate)
    
    if (!availability.available) {
      return NextResponse.json(
        { error: 'Valitud aeg pole saadaval' },
        { status: 409 }
      )
    }
    
    // Create booking
    const booking = await createBooking(productId, compartmentId, startDate, endDate)
    
    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Broneerimine ebaõnnestus' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const compartmentId = searchParams.get('compartmentId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // TODO: Implement GET endpoint for fetching bookings
    // This would be used to check availability in real-time
    
    return NextResponse.json({ bookings: [] })
  } catch (error) {
    console.error('Booking fetch error:', error)
    return NextResponse.json(
      { error: 'Broneeringute laadimine ebaõnnestus' },
      { status: 500 }
    )
  }
}
