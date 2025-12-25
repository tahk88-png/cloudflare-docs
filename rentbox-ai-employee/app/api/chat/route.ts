import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/lib/ai/orchestrator';
import { checkRateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  conversation_id: z.string().optional(),
  booking_id: z.number().optional(),
  user_id: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversation_id, booking_id, user_id } = chatSchema.parse(body);

    // Check rate limit
    const rateLimit = await checkRateLimit(
      user_id || null,
      'chat_message',
      parseInt(process.env.RATE_LIMIT_MESSAGES_PER_HOUR || '10', 10)
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate or get conversation ID
    const convId = conversation_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Route message through orchestrator
    const response = await routeMessage(convId, user_id || null, booking_id || null, message);

    return NextResponse.json({
      conversation_id: convId,
      response,
      remaining: rateLimit.remaining,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
    }

    const result = await db.query(
      `SELECT id, role, content, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return NextResponse.json({ messages: result.rows });
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
