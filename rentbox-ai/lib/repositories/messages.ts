import { query } from '../db';
import { Message } from '../types';

export class MessageRepository {
  static async create(data: {
    conversation_id: string;
    booking_id?: number;
    user_id?: number;
    role: Message['role'];
    content: string;
    agent_type?: Message['agent_type'];
    tool_calls?: any;
    metadata?: any;
  }): Promise<Message> {
    const result = await query<Message>(
      `INSERT INTO messages (
        conversation_id, booking_id, user_id, role, content,
        agent_type, tool_calls, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.conversation_id,
        data.booking_id,
        data.user_id,
        data.role,
        data.content,
        data.agent_type,
        data.tool_calls ? JSON.stringify(data.tool_calls) : null,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );

    return result.rows[0];
  }

  static async findByConversation(conversationId: string): Promise<Message[]> {
    const result = await query<Message>(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return result.rows;
  }

  static async findByBooking(bookingId: number): Promise<Message[]> {
    const result = await query<Message>(
      `SELECT * FROM messages 
       WHERE booking_id = $1 
       ORDER BY created_at ASC`,
      [bookingId]
    );

    return result.rows;
  }
}
