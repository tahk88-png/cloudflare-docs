import { NextRequest, NextResponse } from 'next/server';
import { orchestrateAgent } from '@/lib/agents/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, message } = body;

    if (!bookingId || !message) {
      return NextResponse.json({ error: 'Missing bookingId or message' }, { status: 400 });
    }

    const result = await orchestrateAgent(bookingId, message);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
