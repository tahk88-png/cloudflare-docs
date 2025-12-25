import { NextRequest, NextResponse } from 'next/server'
import { getBookingQuote } from '@/lib/api/bookings'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, startAt, endAt } = body

    if (!productId || !startAt || !endAt) {
      return NextResponse.json(
        { error: 'productId, startAt, and endAt are required' },
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

    const quote = await getBookingQuote({
      productId,
      startAt: startDate,
      endAt: endDate,
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Quote generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate quote' },
      { status: 500 }
    )
  }
}
