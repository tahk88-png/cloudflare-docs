import { Product, PricingBreakdown } from '../types';

// Configuration (could be DB driven)
const PRICING_RULES = {
  weekendMultiplier: 1.5, // Sat/Sun
  peakHourMultiplier: 1.2, // 17:00 - 20:00
  longRentalDiscountThresholdHours: 24,
  longRentalDiscountRate: 0.2, // 20% off if > 24h
  defaultDeposit: 50.00
};

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sun or Sat
}

function isPeakHour(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 17 && hour < 20;
}

export function calculatePrice(
  product: Product,
  startAt: Date,
  endAt: Date
): PricingBreakdown {
  const durationMs = endAt.getTime() - startAt.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  
  let totalPrice = 0;
  let current = new Date(startAt);
  
  // Iterate hour by hour to apply granular rules (simplified for example)
  // In production, math-based range calculation is faster than iteration for long ranges.
  // Here we use iteration for clarity on the rules.
  while (current < endAt) {
    let hourlyPrice = product.base_price_per_hour;
    
    if (isWeekend(current)) {
      hourlyPrice *= PRICING_RULES.weekendMultiplier;
    }
    
    if (isPeakHour(current)) {
      hourlyPrice *= PRICING_RULES.peakHourMultiplier;
    }
    
    // Add logic for partial hours if needed (assuming hourly chunks for now)
    totalPrice += hourlyPrice;
    
    current.setHours(current.getHours() + 1);
  }

  // Apply long rental discount
  const isLongRental = durationHours >= PRICING_RULES.longRentalDiscountThresholdHours;
  let discountAmount = 0;
  if (isLongRental) {
    discountAmount = totalPrice * PRICING_RULES.longRentalDiscountRate;
    totalPrice -= discountAmount;
  }

  return {
    base_price: product.base_price_per_hour,
    duration_hours: durationHours,
    peak_multiplier: PRICING_RULES.peakHourMultiplier,
    weekend_multiplier: PRICING_RULES.weekendMultiplier,
    long_rental_discount: discountAmount,
    deposit: PRICING_RULES.defaultDeposit,
    total: parseFloat(totalPrice.toFixed(2))
  };
}
