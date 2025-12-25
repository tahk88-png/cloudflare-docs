import { NextRequest, NextResponse } from 'next/server';
import { MessageRepository } from '@/lib/repositories/messages';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    const bookingId = searchParams.get('booking_id');

    if (!conversationId && !bookingId) {
      return NextResponse.json(
        { success: false, error: 'conversation_id or booking_id is required' },
        { status: 400 }
      );
    }

    let messages;
    if (bookingId) {
      messages = await MessageRepository.findByBooking(parseInt(bookingId));
    } else if (conversationId) {
      messages = await MessageRepository.findByConversation(conversationId);
    }

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error: any) {
    console.error('Chat history API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
