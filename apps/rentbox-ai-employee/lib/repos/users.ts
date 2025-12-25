import { dbQuery } from "../db";

export type UserRow = {
  id: string;
  created_at: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: "customer" | "admin" | "agent";
  metadata: unknown;
};

export async function getUserById(userId: string): Promise<UserRow | null> {
  const q = await dbQuery<UserRow>(`select * from users where id = $1 limit 1`, [userId]);
  return q.rows[0] ?? null;
}

