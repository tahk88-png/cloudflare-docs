// Authentication and authorization service

import type { D1Database } from '@cloudflare/workers-types';
import type { User, UserRole, Permissions } from '../types';
import { ROLE_PERMISSIONS } from '../types';
import { generateId, generateSecureToken } from '../utils/id';

/**
 * Authenticate user by session token
 */
export async function authenticateUser(
  db: D1Database,
  token: string
): Promise<User | null> {
  // Get session
  const session = await db
    .prepare(
      `SELECT s.*, u.* FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
    )
    .bind(token)
    .first<User>();
  
  if (!session) {
    return null;
  }
  
  return session;
}

/**
 * Create session for user
 */
export async function createSession(
  db: D1Database,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId('session'),
      userId,
      token,
      expiresAt.toISOString(),
      ipAddress || null,
      userAgent || null
    )
    .run();
  
  return token;
}

/**
 * Delete session (logout)
 */
export async function deleteSession(
  db: D1Database,
  token: string
): Promise<void> {
  await db
    .prepare('DELETE FROM sessions WHERE token = ?')
    .bind(token)
    .run();
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(role: UserRole): Permissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if user has permission
 */
export function hasPermission(
  user: User,
  permission: keyof Permissions
): boolean {
  const permissions = getUserPermissions(user.role);
  return permissions[permission];
}

/**
 * Verify password hash (in production, use bcrypt or similar)
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // In production, use bcrypt.compare() or similar
  // For now, simplified implementation
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === hash;
}

/**
 * Hash password (in production, use bcrypt or similar)
 */
export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt.hash() with proper salt rounds
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract bearer token from request
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  db: D1Database,
  request: Request
): Promise<User> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }
  
  const user = await authenticateUser(db, token);
  if (!user) {
    throw new Error('Unauthorized: Invalid token');
  }
  
  return user;
}

/**
 * Middleware to require specific permission
 */
export async function requirePermission(
  db: D1Database,
  request: Request,
  permission: keyof Permissions
): Promise<User> {
  const user = await requireAuth(db, request);
  
  if (!hasPermission(user, permission)) {
    throw new Error(`Forbidden: Missing permission ${permission}`);
  }
  
  return user;
}

/**
 * Middleware to require resource ownership (same company)
 */
export async function requireCompanyAccess(
  user: User,
  resourceCompanyId: string
): Promise<void> {
  if (user.company_id !== resourceCompanyId) {
    throw new Error('Forbidden: Access denied to resource from different company');
  }
}
