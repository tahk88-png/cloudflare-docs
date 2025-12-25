import { logRateLimitExceeded } from "./logging";

// Simple in-memory rate limiter
// In production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"); // 1 minute
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "100");

/**
 * Check if request should be rate limited
 * Returns true if rate limit exceeded
 */
export async function checkRateLimit(
  identifier: string,
  path: string,
  maxRequests = MAX_REQUESTS
): Promise<{ limited: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = `${identifier}:${path}`;
  
  let record = rateLimitStore.get(key);
  
  // Clean up expired records periodically
  if (Math.random() < 0.01) {
    cleanupExpiredRecords();
  }
  
  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + WINDOW_MS };
    rateLimitStore.set(key, record);
  }
  
  record.count++;
  
  const limited = record.count > maxRequests;
  const remaining = Math.max(0, maxRequests - record.count);
  
  if (limited) {
    await logRateLimitExceeded(identifier, path);
  }
  
  return { limited, remaining, resetAt: record.resetAt };
}

function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit decorator for server actions
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  identifier: () => string,
  maxRequests = MAX_REQUESTS
): T {
  return (async (...args: unknown[]) => {
    const id = identifier();
    const { limited } = await checkRateLimit(id, fn.name, maxRequests);
    
    if (limited) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    
    return fn(...args);
  }) as T;
}
