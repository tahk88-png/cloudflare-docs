import { query } from '../db';
import { Event } from '../types';

export class EventRepository {
  static async create(data: {
    event_type: string;
    entity_type?: string;
    entity_id?: number;
    payload: any;
  }): Promise<Event> {
    const result = await query<Event>(
      `INSERT INTO events (event_type, entity_type, entity_id, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.event_type,
        data.entity_type,
        data.entity_id,
        JSON.stringify(data.payload)
      ]
    );

    return result.rows[0];
  }

  static async findUnprocessed(limit: number = 100): Promise<Event[]> {
    const result = await query<Event>(
      `SELECT * FROM events 
       WHERE processed = false 
       ORDER BY created_at ASC 
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  static async markAsProcessed(id: number): Promise<void> {
    await query(
      `UPDATE events SET processed = true, processed_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  static async findByBooking(
    bookingId: number,
    eventType?: string
  ): Promise<Event[]> {
    let sql = `
      SELECT * FROM events 
      WHERE entity_type = 'booking' AND entity_id = $1
    `;
    const params: any[] = [bookingId];

    if (eventType) {
      sql += ` AND event_type = $2`;
      params.push(eventType);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query<Event>(sql, params);
    return result.rows;
  }
}
