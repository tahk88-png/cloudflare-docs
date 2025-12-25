import { NextRequest, NextResponse } from 'next/server';
import { TicketRepository } from '@/lib/repositories/tickets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const tickets = await TicketRepository.findAll(filters);

    return NextResponse.json({
      success: true,
      tickets,
      filters
    });
  } catch (error: any) {
    console.error('Tickets API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
