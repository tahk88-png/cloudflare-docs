import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireAuth();

    const lockers = await prisma.locker.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ lockers });
  } catch (error) {
    console.error('Get lockers error:', error);
    return NextResponse.json({ error: 'Failed to fetch lockers' }, { status: 500 });
  }
}
