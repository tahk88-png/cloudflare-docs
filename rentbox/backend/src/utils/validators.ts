import { z } from 'zod';

export const createCartItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  start_at: z.string().datetime('Invalid start date'),
  end_at: z.string().datetime('Invalid end date'),
}).refine((data) => {
  const start = new Date(data.start_at);
  const end = new Date(data.end_at);
  return end > start;
}, {
  message: 'End date must be after start date',
});

export const updateCartItemSchema = z.object({
  start_at: z.string().datetime('Invalid start date').optional(),
  end_at: z.string().datetime('Invalid end date').optional(),
}).refine((data) => {
  if (data.start_at && data.end_at) {
    const start = new Date(data.start_at);
    const end = new Date(data.end_at);
    return end > start;
  }
  return true;
}, {
  message: 'End date must be after start date',
});

export const checkoutSchema = z.object({
  return_url: z.string().url('Invalid return URL'),
  cancel_url: z.string().url('Invalid cancel URL'),
  user_email: z.string().email('Invalid email').optional(),
});

export const extendBookingSchema = z.object({
  new_end_at: z.string().datetime('Invalid end date'),
});

export const availabilityQuerySchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  start_at: z.string().datetime('Invalid start date'),
  end_at: z.string().datetime('Invalid end date'),
});

export function validateTimeRange(start: Date, end: Date): void {
  const now = new Date();
  
  if (start < now) {
    throw new Error('Start date cannot be in the past');
  }
  
  if (end <= start) {
    throw new Error('End date must be after start date');
  }
  
  const maxRentalDays = 30;
  const rentalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  
  if (rentalDays > maxRentalDays) {
    throw new Error(`Rental period cannot exceed ${maxRentalDays} days`);
  }
}
