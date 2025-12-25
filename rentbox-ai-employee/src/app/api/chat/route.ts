import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { processMessage, getOrCreateConversation } from '@/lib/ai/orchestrator';

// Schema for chat message
const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/chat - Send a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = chatMessageSchema.parse(body);

    let conversationId = validated.conversationId;
    let userId = validated.userId;

    // If no conversation, we need userId to create one
    if (!conversationId) {
      if (!userId) {
        return NextResponse.json(
          { error: 'Either conversationId or userId is required' },
          { status: 400 }
        );
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Get or create conversation
      conversationId = await getOrCreateConversation(
        userId,
        validated.bookingId,
        validated.context
      );
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Process the message
    const result = await processMessage(conversationId, validated.message);

    return NextResponse.json({
      conversationId,
      response: result.response,
      agentRole: result.agentRole,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/chat - Get conversations or messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');

    if (conversationId) {
      // Get messages for a conversation
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          agentRole: true,
          createdAt: true,
        },
      });

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          status: true,
          currentAgent: true,
          bookingId: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        conversation,
        messages,
      });
    }

    if (userId) {
      // Get conversations for a user
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          status: true,
          currentAgent: true,
          bookingId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true },
          },
        },
      });

      return NextResponse.json({ conversations });
    }

    return NextResponse.json(
      { error: 'Either conversationId or userId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Chat API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
