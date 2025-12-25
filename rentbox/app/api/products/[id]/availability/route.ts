import { NextRequest, NextResponse } from 'next/server'
import { checkAvailability } from '@/lib/api/bookings'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startAt = searchParams.get('startAt')
    const endAt = searchParams.get('endAt')

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: 'startAt and endAt parameters required' },
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

    const result = await checkAvailability({
      productId: params.id,
      startAt: startDate,
      endAt: endDate,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Availability check error:', error)
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
}
