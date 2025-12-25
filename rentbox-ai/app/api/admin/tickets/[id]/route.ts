import { NextRequest, NextResponse } from 'next/server';
import { TicketRepository } from '@/lib/repositories/tickets';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
  assigned_to: z.string().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = parseInt(params.id);
    const ticket = await TicketRepository.findById(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket
    });
  } catch (error: any) {
    console.error('Ticket detail API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = parseInt(params.id);
    const body = await request.json();
    const validated = updateSchema.parse(body);

    if (validated.status) {
      await TicketRepository.updateStatus(ticketId, validated.status);
    }

    if (validated.assigned_to) {
      await TicketRepository.assignTo(ticketId, validated.assigned_to);
    }

    const ticket = await TicketRepository.findById(ticketId);

    return NextResponse.json({
      success: true,
      ticket
    });
  } catch (error: any) {
    console.error('Ticket update API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
