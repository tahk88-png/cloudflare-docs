// ═══════════════════════════════════════════════════════════════════════════
// LUKKU - DYNAMIC PRICING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

import { differenceInHours, differenceInDays, getHours, isWeekend, getDay } from 'date-fns';
import { queryMany } from '../db/index.js';
import type { Product, PriceBreakdown, PriceAdjustment, PricingRule } from '../types/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface PricingConfig {
  // Peak hours (e.g., 7-9 AM, 5-7 PM on weekdays)
  peakHours: { start: number; end: number }[];
  peakHoursMultiplier: number;
  
  // Weekend pricing
  weekendMultiplier: number;
  
  // Long rental discounts
  longRentalThresholds: { days: number; discount: number }[];
  
  // Minimum rental duration in hours
  minimumDuration: number;
  
  // Maximum rental duration in days
  maximumDuration: number;
}

const DEFAULT_CONFIG: PricingConfig = {
  peakHours: [
    { start: 7, end: 9 },   // Morning rush
    { start: 17, end: 19 }, // Evening rush
  ],
  peakHoursMultiplier: 1.2, // 20% increase during peak
  
  weekendMultiplier: 1.15, // 15% increase on weekends
  
  longRentalThresholds: [
    { days: 3, discount: 0.05 },  // 5% off for 3+ days
    { days: 7, discount: 0.10 },  // 10% off for 7+ days
    { days: 14, discount: 0.15 }, // 15% off for 14+ days
    { days: 30, discount: 0.20 }, // 20% off for 30+ days
  ],
  
  minimumDuration: 1, // 1 hour minimum
  maximumDuration: 90, // 90 days maximum
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PRICING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the price for a rental
 */
export async function calculatePrice(
  product: Product,
  startAt: Date,
  endAt: Date,
  config: PricingConfig = DEFAULT_CONFIG
): Promise<PriceBreakdown> {
  // Calculate duration
  const totalHours = differenceInHours(endAt, startAt);
  const totalDays = differenceInDays(endAt, startAt);
  
  // Validate duration
  if (totalHours < config.minimumDuration) {
    throw new Error(`Minimum rental duration is ${config.minimumDuration} hour(s)`);
  }
  
  if (totalDays > config.maximumDuration) {
    throw new Error(`Maximum rental duration is ${config.maximumDuration} days`);
  }
  
  // Calculate base price
  const { basePrice, hours, days } = calculateBasePrice(
    product,
    totalHours,
    totalDays
  );
  
  // Collect all adjustments
  const adjustments: PriceAdjustment[] = [];
  
  // Apply peak hours pricing
  const peakAdjustment = calculatePeakHoursAdjustment(
    startAt,
    endAt,
    basePrice,
    config
  );
  if (peakAdjustment) {
    adjustments.push(peakAdjustment);
  }
  
  // Apply weekend pricing
  const weekendAdjustment = calculateWeekendAdjustment(
    startAt,
    endAt,
    basePrice,
    config
  );
  if (weekendAdjustment) {
    adjustments.push(weekendAdjustment);
  }
  
  // Apply long rental discount
  const longRentalDiscount = calculateLongRentalDiscount(
    totalDays,
    basePrice,
    config
  );
  if (longRentalDiscount) {
    adjustments.push(longRentalDiscount);
  }
  
  // Load and apply custom pricing rules from database
  const customRules = await loadActivePricingRules();
  for (const rule of customRules) {
    const adjustment = applyPricingRule(rule, product, startAt, endAt, basePrice);
    if (adjustment) {
      adjustments.push(adjustment);
    }
  }
  
  // Calculate subtotal with adjustments
  const adjustmentTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
  const subtotal = Math.max(0, basePrice + adjustmentTotal);
  
  // Get deposit
  const deposit = product.deposit_amount;
  
  // Calculate final total
  const total = subtotal + deposit;
  
  return {
    base_price: basePrice,
    hours,
    days,
    hourly_rate: product.base_price_per_hour,
    daily_rate: product.base_price_per_day,
    subtotal,
    adjustments,
    deposit,
    total,
    currency: 'EUR',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE PRICE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate base price using optimal combination of daily/hourly rates
 */
function calculateBasePrice(
  product: Product,
  totalHours: number,
  totalDays: number
): { basePrice: number; hours: number; days: number } {
  const hourlyRate = product.base_price_per_hour;
  const dailyRate = product.base_price_per_day;
  
  // If less than a day, use hourly rate
  if (totalHours < 24) {
    return {
      basePrice: roundPrice(totalHours * hourlyRate),
      hours: totalHours,
      days: 0,
    };
  }
  
  // Calculate optimal mix of days and hours
  // Find the point where daily rate is more economical
  const hoursEquivalentToDay = dailyRate / hourlyRate;
  
  // Use full days where beneficial
  const fullDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  
  // Check if remaining hours should use hourly or add another day
  let optimalDays = fullDays;
  let optimalHours = remainingHours;
  
  // If remaining hours cost more than the difference to a full day, add a day
  if (remainingHours > 0 && remainingHours * hourlyRate > dailyRate) {
    optimalDays = fullDays + 1;
    optimalHours = 0;
  }
  
  const basePrice = roundPrice(
    (optimalDays * dailyRate) + (optimalHours * hourlyRate)
  );
  
  return {
    basePrice,
    hours: optimalHours,
    days: optimalDays,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADJUSTMENT CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate peak hours surcharge
 */
function calculatePeakHoursAdjustment(
  startAt: Date,
  endAt: Date,
  basePrice: number,
  config: PricingConfig
): PriceAdjustment | null {
  const startHour = getHours(startAt);
  const endHour = getHours(endAt);
  const startDay = getDay(startAt);
  const endDay = getDay(endAt);
  
  // Only apply to weekdays (Mon-Fri = 1-5)
  const isStartWeekday = startDay >= 1 && startDay <= 5;
  const isEndWeekday = endDay >= 1 && endDay <= 5;
  
  if (!isStartWeekday && !isEndWeekday) {
    return null;
  }
  
  // Check if start or end falls within peak hours
  const isPeakStart = config.peakHours.some(
    peak => startHour >= peak.start && startHour < peak.end
  );
  const isPeakEnd = config.peakHours.some(
    peak => endHour >= peak.start && endHour < peak.end
  );
  
  if (!isPeakStart && !isPeakEnd) {
    return null;
  }
  
  // Apply peak surcharge (simplified: flat rate if touches peak hours)
  const surchargeAmount = roundPrice(basePrice * (config.peakHoursMultiplier - 1));
  
  return {
    name: 'Peak Hours Surcharge',
    type: 'multiplier',
    value: config.peakHoursMultiplier,
    amount: surchargeAmount,
    description: 'Rental includes peak hours (7-9 AM or 5-7 PM on weekdays)',
  };
}

/**
 * Calculate weekend surcharge
 */
function calculateWeekendAdjustment(
  startAt: Date,
  endAt: Date,
  basePrice: number,
  config: PricingConfig
): PriceAdjustment | null {
  // Check if rental spans weekend
  const startsOnWeekend = isWeekend(startAt);
  const endsOnWeekend = isWeekend(endAt);
  
  // For simplicity, apply weekend rate if starts or ends on weekend
  if (!startsOnWeekend && !endsOnWeekend) {
    return null;
  }
  
  const surchargeAmount = roundPrice(basePrice * (config.weekendMultiplier - 1));
  
  return {
    name: 'Weekend Rate',
    type: 'multiplier',
    value: config.weekendMultiplier,
    amount: surchargeAmount,
    description: 'Weekend rental surcharge',
  };
}

/**
 * Calculate long rental discount
 */
function calculateLongRentalDiscount(
  totalDays: number,
  basePrice: number,
  config: PricingConfig
): PriceAdjustment | null {
  // Find applicable discount tier
  const applicableTier = config.longRentalThresholds
    .filter(tier => totalDays >= tier.days)
    .sort((a, b) => b.days - a.days)[0];
  
  if (!applicableTier) {
    return null;
  }
  
  const discountAmount = roundPrice(-basePrice * applicableTier.discount);
  
  return {
    name: 'Long Rental Discount',
    type: 'multiplier',
    value: 1 - applicableTier.discount,
    amount: discountAmount,
    description: `${applicableTier.discount * 100}% discount for ${applicableTier.days}+ day rental`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM PRICING RULES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load active pricing rules from database
 */
async function loadActivePricingRules(): Promise<PricingRule[]> {
  try {
    const rules = await queryMany<PricingRule>(`
      SELECT * FROM pricing_rules
      WHERE is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW())
      ORDER BY priority DESC
    `);
    return rules;
  } catch {
    // If table doesn't exist or query fails, return empty array
    return [];
  }
}

/**
 * Apply a custom pricing rule
 */
function applyPricingRule(
  rule: PricingRule,
  product: Product,
  startAt: Date,
  endAt: Date,
  basePrice: number
): PriceAdjustment | null {
  const conditions = rule.conditions as {
    categories?: string[];
    product_ids?: string[];
    min_hours?: number;
    max_hours?: number;
    days_of_week?: number[];
    date_range?: { start: string; end: string };
  };
  
  // Check category condition
  if (conditions.categories && product.category) {
    if (!conditions.categories.includes(product.category)) {
      return null;
    }
  }
  
  // Check product ID condition
  if (conditions.product_ids) {
    if (!conditions.product_ids.includes(product.id)) {
      return null;
    }
  }
  
  // Check duration conditions
  const totalHours = differenceInHours(endAt, startAt);
  if (conditions.min_hours && totalHours < conditions.min_hours) {
    return null;
  }
  if (conditions.max_hours && totalHours > conditions.max_hours) {
    return null;
  }
  
  // Check day of week condition
  if (conditions.days_of_week) {
    const startDay = getDay(startAt);
    if (!conditions.days_of_week.includes(startDay)) {
      return null;
    }
  }
  
  // Calculate adjustment amount
  let amount = 0;
  
  if (rule.multiplier !== 1.0) {
    amount = roundPrice(basePrice * (rule.multiplier - 1));
  }
  
  if (rule.fixed_adjustment !== 0) {
    amount += rule.fixed_adjustment;
  }
  
  if (amount === 0) {
    return null;
  }
  
  return {
    name: rule.name,
    type: rule.multiplier !== 1.0 ? 'multiplier' : 'fixed',
    value: rule.multiplier !== 1.0 ? rule.multiplier : rule.fixed_adjustment,
    amount,
    description: rule.description || rule.name,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Round price to 2 decimal places
 */
function roundPrice(price: number): number {
  return Math.round(price * 100) / 100;
}

/**
 * Validate rental duration
 */
export function validateDuration(
  startAt: Date,
  endAt: Date,
  config: PricingConfig = DEFAULT_CONFIG
): { valid: boolean; error?: string } {
  if (endAt <= startAt) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  const totalHours = differenceInHours(endAt, startAt);
  
  if (totalHours < config.minimumDuration) {
    return {
      valid: false,
      error: `Minimum rental duration is ${config.minimumDuration} hour(s)`,
    };
  }
  
  const totalDays = differenceInDays(endAt, startAt);
  if (totalDays > config.maximumDuration) {
    return {
      valid: false,
      error: `Maximum rental duration is ${config.maximumDuration} days`,
    };
  }
  
  return { valid: true };
}

/**
 * Calculate additional cost for extending a rental
 */
export async function calculateExtensionPrice(
  product: Product,
  currentEndAt: Date,
  newEndAt: Date
): Promise<PriceBreakdown> {
  if (newEndAt <= currentEndAt) {
    throw new Error('New end time must be after current end time');
  }
  
  // Calculate price for extension period only
  return calculatePrice(product, currentEndAt, newEndAt);
}

/**
 * Estimate price without database lookup (for quick estimates)
 */
export function estimatePrice(
  hourlyRate: number,
  dailyRate: number,
  deposit: number,
  startAt: Date,
  endAt: Date
): { estimatedTotal: number; breakdown: string } {
  const totalHours = differenceInHours(endAt, startAt);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  
  let basePrice: number;
  let breakdown: string;
  
  if (days === 0) {
    basePrice = hours * hourlyRate;
    breakdown = `${hours}h × €${hourlyRate}/h`;
  } else if (hours === 0) {
    basePrice = days * dailyRate;
    breakdown = `${days}d × €${dailyRate}/d`;
  } else {
    basePrice = (days * dailyRate) + (hours * hourlyRate);
    breakdown = `${days}d × €${dailyRate}/d + ${hours}h × €${hourlyRate}/h`;
  }
  
  return {
    estimatedTotal: roundPrice(basePrice + deposit),
    breakdown: `${breakdown} + €${deposit} deposit`,
  };
}

export { DEFAULT_CONFIG, type PricingConfig };
