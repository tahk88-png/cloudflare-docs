import { db } from './db';

export async function checkRateLimit(
  userId: number | null,
  actionType: string,
  limit: number,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  if (!userId) {
    // Allow anonymous users with stricter limits
    return { allowed: true, remaining: limit };
  }

  const result = await db.query(
    `SELECT SUM(count) as total_count
     FROM rate_limits
     WHERE user_id = $1 AND action_type = $2 AND window_start >= $3`,
    [userId, actionType, windowStart]
  );

  const totalCount = parseInt(result.rows[0]?.total_count || '0', 10);

  if (totalCount >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Record this action
  const now = new Date();
  now.setMinutes(0, 0, 0); // Round down to hour

  await db.query(
    `INSERT INTO rate_limits (user_id, action_type, count, window_start)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (user_id, action_type, window_start)
     DO UPDATE SET count = rate_limits.count + 1`,
    [userId, actionType, now]
  );

  return { allowed: true, remaining: limit - totalCount - 1 };
}
