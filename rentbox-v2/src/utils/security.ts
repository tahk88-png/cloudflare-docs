// ============================================================================
// Rentbox v2: Security & Rate Limiting Utilities
// ============================================================================

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  checkLimit(key: string): Promise<boolean>;
}

/**
 * Simple in-memory rate limiter (use Redis in production)
 */
export class InMemoryRateLimiter implements RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }
}

/**
 * Validates discount/voucher code format
 */
export function validateCodeFormat(code: string): { valid: boolean; error?: string } {
  if (!code || code.length < 4 || code.length > 50) {
    return {
      valid: false,
      error: 'Code must be between 4 and 50 characters',
    };
  }

  // Allow alphanumeric and hyphens
  if (!/^[A-Z0-9-]+$/i.test(code)) {
    return {
      valid: false,
      error: 'Code can only contain letters, numbers, and hyphens',
    };
  }

  return { valid: true };
}

/**
 * Normalizes code (uppercase, trim)
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Validates admin authentication (example - implement based on your auth system)
 */
export async function validateAdminAuth(
  request: Request
): Promise<{ valid: boolean; adminUserId?: string; error?: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Missing or invalid authorization header',
    };
  }

  const token = authHeader.substring(7);

  // TODO: Verify JWT token and extract admin user ID
  // Example:
  // const payload = await verifyJWT(token);
  // if (!payload.isAdmin) {
  //   return { valid: false, error: 'Not authorized' };
  // }
  // return { valid: true, adminUserId: payload.userId };

  // Placeholder
  return {
    valid: true,
    adminUserId: 'admin-user-id-from-token',
  };
}

/**
 * Validates webhook signature (example for Stripe)
 */
export async function validateWebhookSignature(
  request: Request,
  secret: string
): Promise<boolean> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return false;
  }

  // TODO: Implement Stripe webhook signature verification
  // See: https://stripe.com/docs/webhooks/signatures

  return true;
}

/**
 * Sanitizes user input for code
 */
export function sanitizeCodeInput(input: string): string {
  return normalizeCode(input).slice(0, 50);
}
