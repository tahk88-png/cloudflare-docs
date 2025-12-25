import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';

import db from './db/connection.js';
import { errorHandler } from './middleware/error-handler.js';

// API Routes
import cartRoutes from './api/cart.js';
import checkoutRoutes from './api/checkout.js';
import bookingsRoutes from './api/bookings.js';
import paymentsRoutes from './api/payments.js';
import adminRoutes from './api/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Body parsing
// Special handling for Stripe webhooks - need raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  
  if (dbHealthy) {
    res.json({ status: 'healthy', database: 'connected' });
  } else {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// API Routes
app.use('/api/cart', cartRoutes);
app.use('/api/cart', checkoutRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      error: 'Endpoint not found',
    },
  });
});

// Error handler
app.use(errorHandler);

// Cleanup tasks (run every 5 minutes)
setInterval(async () => {
  try {
    await db.query('SELECT cleanup_expired_carts()');
    console.log('Cleanup task completed');
  } catch (error) {
    console.error('Cleanup task failed:', error);
  }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rentbox API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

export default app;
