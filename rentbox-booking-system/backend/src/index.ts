// ═══════════════════════════════════════════════════════════════════════════
// RENTBOX BOOKING API - MAIN APPLICATION
// ═══════════════════════════════════════════════════════════════════════════

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import cartRoutes from './api/cart.js';
import checkoutRoutes from './api/checkout.js';
import bookingRoutes from './api/booking.js';
import adminRoutes from './api/admin.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { 
  apiLimiter, 
  cartCreationLimiter, 
  checkoutLimiter,
  adminLimiter 
} from './middleware/rate-limit.js';
import { healthCheck, cleanupExpired } from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Webhook endpoint needs raw body for signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(express.json());

// General rate limiting
app.use('/api', apiLimiter);

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await healthCheck();
  
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'up' : 'down',
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Cart routes with creation rate limit
app.post('/api/cart', cartCreationLimiter);
app.use('/api/cart', cartRoutes);

// Checkout routes with rate limit
app.post('/api/cart/:id/checkout', checkoutLimiter);
app.use('/api', checkoutRoutes);

// Booking routes
app.use('/api/bookings', bookingRoutes);

// Admin routes with separate rate limit
app.use('/api/admin', adminLimiter, adminRoutes);

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

app.use(notFoundHandler);
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND TASKS
// ═══════════════════════════════════════════════════════════════════════════

// Cleanup expired carts and locks every minute
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

setInterval(async () => {
  try {
    const result = await cleanupExpired();
    if (result.locks > 0 || result.carts > 0) {
      console.log(`Cleanup: ${result.locks} expired locks, ${result.carts} expired carts`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, CLEANUP_INTERVAL);

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
═══════════════════════════════════════════════════════════════════════════
  RENTBOX BOOKING API
  Server running on port ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
═══════════════════════════════════════════════════════════════════════════
  `);
});

export default app;
