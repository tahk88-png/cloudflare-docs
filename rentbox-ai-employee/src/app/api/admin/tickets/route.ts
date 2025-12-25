import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';

// Schema for creating/updating tickets
const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.nativeEnum(TicketPriority).default(TicketPriority.MEDIUM),
  category: z.nativeEnum(TicketCategory).default(TicketCategory.GENERAL),
  bookingId: z.string().uuid().optional(),
  createdById: z.string().uuid(),
  assignedToId: z.string().uuid().optional(),
});

const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  resolution: z.string().max(5000).optional(),
});

// GET /api/admin/tickets - List tickets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const assignedToId = searchParams.get('assignedToId');
    const bookingId = searchParams.get('bookingId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedToId) where.assignedToId = assignedToId;
    if (bookingId) where.bookingId = bookingId;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              product: { select: { name: true } },
              user: { select: { name: true, email: true } },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { aiActions: true },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({
      tickets,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Tickets GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tickets - Create a ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTicketSchema.parse(body);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: validated.createdById },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Creator user not found' },
        { status: 404 }
      );
    }

    // Verify booking if provided
    if (validated.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: validated.bookingId },
      });

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }
    }

    const ticket = await prisma.ticket.create({
      data: validated,
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            product: { select: { name: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error('Tickets POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid ticket data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tickets - Update a ticket
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = updateTicketSchema.parse(body);

    // Check if ticket exists
    const existing = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = { ...validated };
    
    // Set resolved timestamp if status is RESOLVED or CLOSED
    if (validated.status === TicketStatus.RESOLVED || validated.status === TicketStatus.CLOSED) {
      updateData.resolvedAt = new Date();
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            product: { select: { name: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Tickets PATCH error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
