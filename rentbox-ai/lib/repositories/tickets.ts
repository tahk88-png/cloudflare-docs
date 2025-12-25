import { query } from '../db';
import { Ticket, TicketWithDetails } from '../types';

export class TicketRepository {
  static async create(data: {
    booking_id?: number;
    user_id?: number;
    title: string;
    description: string;
    priority: Ticket['priority'];
    category?: string;
  }): Promise<Ticket> {
    const result = await query<Ticket>(
      `INSERT INTO tickets (booking_id, user_id, title, description, priority, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING *`,
      [
        data.booking_id,
        data.user_id,
        data.title,
        data.description,
        data.priority,
        data.category
      ]
    );

    return result.rows[0];
  }

  static async findById(id: number): Promise<TicketWithDetails | null> {
    const result = await query<TicketWithDetails>(
      `SELECT 
        t.*,
        row_to_json(u.*) as user,
        row_to_json(b.*) as booking
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN bookings b ON t.booking_id = b.id
      WHERE t.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async findAll(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<TicketWithDetails[]> {
    let sql = `
      SELECT 
        t.*,
        row_to_json(u.*) as user,
        row_to_json(b.*) as booking
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN bookings b ON t.booking_id = b.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      sql += ` AND t.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.priority) {
      sql += ` AND t.priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters?.category) {
      sql += ` AND t.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    sql += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      t.created_at DESC
    `;

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await query<TicketWithDetails>(sql, params);
    return result.rows;
  }

  static async updateStatus(
    id: number,
    status: Ticket['status']
  ): Promise<void> {
    const resolvedAt = status === 'resolved' ? 'NOW()' : 'NULL';
    
    await query(
      `UPDATE tickets 
       SET status = $1, resolved_at = ${resolvedAt}, updated_at = NOW() 
       WHERE id = $2`,
      [status, id]
    );
  }

  static async assignTo(id: number, assignedTo: string): Promise<void> {
    await query(
      `UPDATE tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
      [assignedTo, id]
    );
  }

  static async findByBookingId(bookingId: number): Promise<Ticket[]> {
    const result = await query<Ticket>(
      `SELECT * FROM tickets WHERE booking_id = $1 ORDER BY created_at DESC`,
      [bookingId]
    );
    return result.rows;
  }
}
