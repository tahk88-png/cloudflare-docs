import { query } from '../db';
import { AIAction } from '../types';

export class AIActionRepository {
  static async log(data: {
    action_type: string;
    agent_type?: string;
    booking_id?: number;
    user_id?: number;
    ticket_id?: number;
    reason: string;
    outcome: AIAction['outcome'];
    outcome_details?: string;
    metadata?: any;
  }): Promise<AIAction> {
    const result = await query<AIAction>(
      `INSERT INTO ai_actions (
        action_type, agent_type, booking_id, user_id, ticket_id,
        reason, outcome, outcome_details, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.action_type,
        data.agent_type,
        data.booking_id,
        data.user_id,
        data.ticket_id,
        data.reason,
        data.outcome,
        data.outcome_details,
        data.metadata ? JSON.stringify(data.metadata) : null
      ]
    );

    return result.rows[0];
  }

  static async findAll(filters?: {
    action_type?: string;
    agent_type?: string;
    booking_id?: number;
    user_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<AIAction[]> {
    let sql = `SELECT * FROM ai_actions WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.action_type) {
      sql += ` AND action_type = $${paramIndex}`;
      params.push(filters.action_type);
      paramIndex++;
    }

    if (filters?.agent_type) {
      sql += ` AND agent_type = $${paramIndex}`;
      params.push(filters.agent_type);
      paramIndex++;
    }

    if (filters?.booking_id) {
      sql += ` AND booking_id = $${paramIndex}`;
      params.push(filters.booking_id);
      paramIndex++;
    }

    if (filters?.user_id) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(filters.user_id);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await query<AIAction>(sql, params);
    return result.rows;
  }

  static async countByType(
    startDate?: Date,
    endDate?: Date
  ): Promise<{ action_type: string; count: number }[]> {
    let sql = `
      SELECT action_type, COUNT(*) as count
      FROM ai_actions
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
    }

    sql += ` GROUP BY action_type ORDER BY count DESC`;

    const result = await query<{ action_type: string; count: string }>(
      sql,
      params
    );

    return result.rows.map(row => ({
      action_type: row.action_type,
      count: parseInt(row.count)
    }));
  }
}
