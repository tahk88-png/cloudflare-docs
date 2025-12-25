// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for cart creation (prevent abuse)
export const cartCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 cart creations per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many cart creations, please wait before trying again',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Checkout rate limit (prevent payment spam)
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 checkout attempts per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many checkout attempts, please wait before trying again',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin endpoints (more lenient)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
