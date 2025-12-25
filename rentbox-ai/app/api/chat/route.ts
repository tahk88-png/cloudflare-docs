import { NextRequest, NextResponse } from 'next/server';
import { AIOrchestrator } from '@/lib/ai/orchestrator';
import { z } from 'zod';

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversation_id: z.string(),
  booking_id: z.number().optional(),
  user_id: z.number().optional(),
  agent_type: z.enum(['support', 'ops', 'sales']).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = chatRequestSchema.parse(body);

    const orchestrator = new AIOrchestrator();
    
    const result = await orchestrator.chat(validated.message, {
      conversation_id: validated.conversation_id,
      booking_id: validated.booking_id,
      user_id: validated.user_id,
      agent_type: validated.agent_type
    });

    return NextResponse.json({
      success: true,
      response: result.response,
      agent_type: result.agent_type,
      tool_calls: result.tool_calls
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
