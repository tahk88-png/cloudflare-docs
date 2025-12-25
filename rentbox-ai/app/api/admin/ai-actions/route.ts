import { NextRequest, NextResponse } from 'next/server';
import { AIActionRepository } from '@/lib/repositories/ai-actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      action_type: searchParams.get('action_type') || undefined,
      agent_type: searchParams.get('agent_type') || undefined,
      booking_id: searchParams.get('booking_id') 
        ? parseInt(searchParams.get('booking_id')!)
        : undefined,
      user_id: searchParams.get('user_id')
        ? parseInt(searchParams.get('user_id')!)
        : undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const actions = await AIActionRepository.findAll(filters);

    // Get action statistics
    const stats = await AIActionRepository.countByType();

    return NextResponse.json({
      success: true,
      actions,
      stats,
      filters
    });
  } catch (error: any) {
    console.error('AI Actions API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
