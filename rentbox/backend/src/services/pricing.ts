import db from '../db/connection.js';
import { PricingBreakdown, PricingAdjustment, PricingRule, Product } from '../types/index.js';
import { differenceInHours, differenceInDays, getDay, getHours } from 'date-fns';

export class PricingService {
  /**
   * Calculate price for a rental period
   */
  async calculatePrice(
    product: Product,
    startAt: Date,
    endAt: Date
  ): Promise<PricingBreakdown> {
    // Calculate duration
    const totalHours = differenceInHours(endAt, startAt);
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    
    // Determine pricing strategy
    let basePrice: number;
    let hourlyRate: number;
    let dailyRate: number;
    
    if (days >= 1) {
      // Use daily pricing for multi-day rentals
      basePrice = (days * product.base_price_daily) + 
                  (remainingHours * product.base_price_hourly);
      hourlyRate = product.base_price_hourly;
      dailyRate = product.base_price_daily;
    } else {
      // Use hourly pricing for short rentals
      basePrice = totalHours * product.base_price_hourly;
      hourlyRate = product.base_price_hourly;
      dailyRate = product.base_price_daily;
    }
    
    let subtotal = basePrice;
    const adjustments: PricingAdjustment[] = [];
    
    // Get active pricing rules
    const rules = await this.getActivePricingRules(startAt, endAt);
    
    // Apply pricing rules in priority order
    for (const rule of rules) {
      const adjustment = this.applyPricingRule(
        rule,
        subtotal,
        startAt,
        endAt,
        totalHours,
        days
      );
      
      if (adjustment) {
        adjustments.push(adjustment);
        subtotal += adjustment.amount;
      }
    }
    
    // Ensure minimum price
    const minimumPrice = product.base_price_hourly;
    if (subtotal < minimumPrice) {
      adjustments.push({
        type: 'fee',
        name: 'Minimum rental price',
        amount: minimumPrice - subtotal,
        applied_to: subtotal,
      });
      subtotal = minimumPrice;
    }
    
    return {
      base_price: basePrice,
      hours: totalHours,
      days: days,
      hourly_rate: hourlyRate,
      daily_rate: dailyRate,
      subtotal: basePrice,
      adjustments,
      total: Math.round(subtotal * 100) / 100,
      deposit: product.deposit_amount,
      currency: 'EUR',
    };
  }
  
  /**
   * Get active pricing rules that apply to the time period
   */
  private async getActivePricingRules(
    startAt: Date,
    endAt: Date
  ): Promise<PricingRule[]> {
    const result = await db.query<PricingRule>(
      `SELECT * FROM pricing_rules
       WHERE active = true
         AND (valid_from IS NULL OR valid_from <= $1)
         AND (valid_until IS NULL OR valid_until >= $2)
       ORDER BY priority DESC`,
      [startAt, endAt]
    );
    
    return result.rows;
  }
  
  /**
   * Apply a single pricing rule
   */
  private applyPricingRule(
    rule: PricingRule,
    currentPrice: number,
    startAt: Date,
    endAt: Date,
    totalHours: number,
    totalDays: number
  ): PricingAdjustment | null {
    switch (rule.rule_type) {
      case 'peak_hours':
        return this.applyPeakHoursRule(rule, currentPrice, startAt, endAt);
      
      case 'weekend':
        return this.applyWeekendRule(rule, currentPrice, startAt, endAt);
      
      case 'duration_discount':
        return this.applyDurationDiscountRule(rule, currentPrice, totalDays);
      
      case 'season':
        return this.applySeasonalRule(rule, currentPrice, startAt);
      
      default:
        return null;
    }
  }
  
  /**
   * Apply peak hours multiplier
   */
  private applyPeakHoursRule(
    rule: PricingRule,
    currentPrice: number,
    startAt: Date,
    endAt: Date
  ): PricingAdjustment | null {
    const peakHours = rule.conditions.hours || [];
    
    // Check if rental overlaps with peak hours
    const startHour = getHours(startAt);
    const endHour = getHours(endAt);
    
    const hasPeakHours = peakHours.some((hour: number) => 
      hour >= startHour && hour <= endHour
    );
    
    if (!hasPeakHours || !rule.multiplier) {
      return null;
    }
    
    const increase = currentPrice * (rule.multiplier - 1);
    
    return {
      type: 'multiplier',
      name: rule.name,
      amount: Math.round(increase * 100) / 100,
      percentage: (rule.multiplier - 1) * 100,
      applied_to: currentPrice,
    };
  }
  
  /**
   * Apply weekend multiplier
   */
  private applyWeekendRule(
    rule: PricingRule,
    currentPrice: number,
    startAt: Date,
    endAt: Date
  ): PricingAdjustment | null {
    const weekendDays = rule.conditions.days || [6, 0]; // Saturday, Sunday
    
    const startDay = getDay(startAt);
    const endDay = getDay(endAt);
    
    const isWeekend = weekendDays.includes(startDay) || weekendDays.includes(endDay);
    
    if (!isWeekend || !rule.multiplier) {
      return null;
    }
    
    const increase = currentPrice * (rule.multiplier - 1);
    
    return {
      type: 'multiplier',
      name: rule.name,
      amount: Math.round(increase * 100) / 100,
      percentage: (rule.multiplier - 1) * 100,
      applied_to: currentPrice,
    };
  }
  
  /**
   * Apply duration discount
   */
  private applyDurationDiscountRule(
    rule: PricingRule,
    currentPrice: number,
    totalDays: number
  ): PricingAdjustment | null {
    const minDays = rule.conditions.min_days || 0;
    
    if (totalDays < minDays || !rule.discount_percentage) {
      return null;
    }
    
    const discount = currentPrice * (rule.discount_percentage / 100);
    
    return {
      type: 'discount',
      name: rule.name,
      amount: -Math.round(discount * 100) / 100,
      percentage: rule.discount_percentage,
      applied_to: currentPrice,
    };
  }
  
  /**
   * Apply seasonal pricing
   */
  private applySeasonalRule(
    rule: PricingRule,
    currentPrice: number,
    startAt: Date
  ): PricingAdjustment | null {
    // Check if current date falls within seasonal period
    const month = startAt.getMonth() + 1;
    const seasonMonths = rule.conditions.months || [];
    
    if (!seasonMonths.includes(month)) {
      return null;
    }
    
    if (rule.multiplier) {
      const increase = currentPrice * (rule.multiplier - 1);
      return {
        type: 'multiplier',
        name: rule.name,
        amount: Math.round(increase * 100) / 100,
        percentage: (rule.multiplier - 1) * 100,
        applied_to: currentPrice,
      };
    }
    
    if (rule.discount_percentage) {
      const discount = currentPrice * (rule.discount_percentage / 100);
      return {
        type: 'discount',
        name: rule.name,
        amount: -Math.round(discount * 100) / 100,
        percentage: rule.discount_percentage,
        applied_to: currentPrice,
      };
    }
    
    return null;
  }
  
  /**
   * Calculate extension price
   */
  async calculateExtensionPrice(
    originalPrice: number,
    originalEndAt: Date,
    newEndAt: Date,
    product: Product
  ): Promise<PricingBreakdown> {
    return this.calculatePrice(product, originalEndAt, newEndAt);
  }
  
  /**
   * Calculate total for multiple items
   */
  calculateCartTotal(items: Array<{ price: number; deposit: number }>): {
    subtotal: number;
    total_deposit: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const totalDeposit = items.reduce((sum, item) => sum + item.deposit, 0);
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      total_deposit: Math.round(totalDeposit * 100) / 100,
      total: Math.round((subtotal + totalDeposit) * 100) / 100,
    };
  }
}

export default new PricingService();
