import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const lockerId = searchParams.get('lockerId');

    const compartments = await prisma.compartment.findMany({
      where: {
        ...(lockerId && { lockerId }),
        active: true,
      },
      include: {
        product: {
          select: { name: true },
        },
      },
      orderBy: { label: 'asc' },
    });

    return NextResponse.json({ compartments });
  } catch (error) {
    console.error('Get compartments error:', error);
    return NextResponse.json({ error: 'Failed to fetch compartments' }, { status: 500 });
  }
}
