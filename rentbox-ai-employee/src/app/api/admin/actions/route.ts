import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AiActionOutcome, AgentRole } from '@prisma/client';

// GET /api/admin/actions - List AI actions (searchable log)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Filter parameters
    const action = searchParams.get('action');
    const outcome = searchParams.get('outcome');
    const agentRole = searchParams.get('agentRole');
    const bookingId = searchParams.get('bookingId');
    const ticketId = searchParams.get('ticketId');
    const triggeredBy = searchParams.get('triggeredBy');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    if (outcome) {
      where.outcome = outcome as AiActionOutcome;
    }

    if (agentRole) {
      where.agentRole = agentRole as AgentRole;
    }

    if (bookingId) {
      where.bookingId = bookingId;
    }

    if (ticketId) {
      where.ticketId = ticketId;
    }

    if (triggeredBy) {
      where.triggeredBy = { contains: triggeredBy, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { error: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [actions, total] = await Promise.all([
      prisma.aiAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              user: { select: { name: true, email: true } },
              product: { select: { name: true } },
            },
          },
          ticket: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          event: {
            select: {
              id: true,
              type: true,
            },
          },
        },
      }),
      prisma.aiAction.count({ where }),
    ]);

    // Get summary stats
    const stats = await prisma.aiAction.groupBy({
      by: ['outcome'],
      _count: true,
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const outcomeSummary = stats.reduce((acc, item) => {
      acc[item.outcome] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      actions: actions.map(a => ({
        ...a,
        // Format for display
        inputSummary: a.input ? summarizeJson(a.input as Record<string, unknown>) : null,
        outputSummary: a.output ? summarizeJson(a.output as Record<string, unknown>) : null,
      })),
      total,
      limit,
      offset,
      stats: {
        last24h: outcomeSummary,
      },
    });
  } catch (error) {
    console.error('Actions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to summarize JSON for display
function summarizeJson(obj: Record<string, unknown>, maxLength = 100): string {
  const str = JSON.stringify(obj);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

// GET single action detail
export async function POST(request: NextRequest) {
  try {
    const { actionId } = await request.json();

    if (!actionId) {
      return NextResponse.json(
        { error: 'actionId is required' },
        { status: 400 }
      );
    }

    const action = await prisma.aiAction.findUnique({
      where: { id: actionId },
      include: {
        booking: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            product: true,
            compartment: {
              include: { locker: true },
            },
          },
        },
        ticket: true,
        event: true,
      },
    });

    if (!action) {
      return NextResponse.json(
        { error: 'Action not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(action);
  } catch (error) {
    console.error('Action detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
