// ============================================================================
// Rentbox v2: Campaign Rule Evaluation Engine
// ============================================================================

import type {
  CampaignRules,
  CampaignTimeRules,
  CampaignLocationRules,
  CampaignProductRules,
  CampaignUserRules,
  CampaignBookingRules,
  Cart,
} from '../types';

export interface EvaluationContext {
  cart: Cart;
  user_id?: string;
  booking_context?: {
    is_first_time?: boolean;
    is_b2b?: boolean;
    booking_duration_minutes?: number;
  };
  current_time?: Date;
}

export interface EvaluationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Evaluates campaign rules against the given context.
 * Returns the first failing rule reason, or success if all rules pass.
 */
export function evaluateCampaignRules(
  rules: CampaignRules,
  context: EvaluationContext
): EvaluationResult {
  const now = context.current_time || new Date();

  // Time rules
  if (rules.time) {
    const timeResult = evaluateTimeRules(rules.time, now);
    if (!timeResult.valid) {
      return timeResult;
    }
  }

  // Location rules
  if (rules.location) {
    const locationResult = evaluateLocationRules(rules.location, context.cart);
    if (!locationResult.valid) {
      return locationResult;
    }
  }

  // Product rules
  if (rules.product) {
    const productResult = evaluateProductRules(rules.product, context.cart);
    if (!productResult.valid) {
      return productResult;
    }
  }

  // User rules
  if (rules.user) {
    const userResult = evaluateUserRules(rules.user, context);
    if (!userResult.valid) {
      return userResult;
    }
  }

  // Booking rules
  if (rules.booking) {
    const bookingResult = evaluateBookingRules(rules.booking, context);
    if (!bookingResult.valid) {
      return bookingResult;
    }
  }

  return { valid: true };
}

function evaluateTimeRules(
  rules: CampaignTimeRules,
  now: Date
): EvaluationResult {
  // Date range check
  if (rules.date_range) {
    const from = new Date(rules.date_range.from);
    const to = new Date(rules.date_range.to);

    if (now < from) {
      return {
        valid: false,
        reason: `Campaign starts on ${from.toISOString()}`,
      };
    }

    if (now > to) {
      return {
        valid: false,
        reason: `Campaign ended on ${to.toISOString()}`,
      };
    }
  }

  // Weekday check
  if (rules.weekdays && rules.weekdays.length > 0) {
    const currentWeekday = now.getUTCDay();
    if (!rules.weekdays.includes(currentWeekday)) {
      const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        valid: false,
        reason: `Campaign only valid on ${rules.weekdays.map(d => weekdayNames[d]).join(', ')}`,
      };
    }
  }

  // Time window check
  if (rules.time_windows && rules.time_windows.length > 0) {
    const timezone = rules.time_windows[0].timezone || 'UTC';
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const inWindow = rules.time_windows.some((window) => {
      const [startHour, startMinute] = window.start.split(':').map(Number);
      const [endHour, endMinute] = window.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight windows (e.g., 22:00-02:00)
      if (endMinutes < startMinutes) {
        return currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes;
      }

      return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
    });

    if (!inWindow) {
      return {
        valid: false,
        reason: `Campaign only valid during ${rules.time_windows.map(w => `${w.start}-${w.end}`).join(', ')}`,
      };
    }
  }

  return { valid: true };
}

function evaluateLocationRules(
  rules: CampaignLocationRules,
  cart: Cart
): EvaluationResult {
  // Locker ID check
  if (rules.locker_ids && rules.locker_ids.length > 0) {
    if (!cart.locker_id || !rules.locker_ids.includes(cart.locker_id)) {
      return {
        valid: false,
        reason: 'Campaign not valid for this locker location',
      };
    }
  }

  // City check
  if (rules.cities && rules.cities.length > 0) {
    if (!cart.city || !rules.cities.includes(cart.city)) {
      return {
        valid: false,
        reason: 'Campaign not valid for this city',
      };
    }
  }

  // Region check
  if (rules.regions && rules.regions.length > 0) {
    if (!cart.region || !rules.regions.includes(cart.region)) {
      return {
        valid: false,
        reason: 'Campaign not valid for this region',
      };
    }
  }

  // Compartment check (check cart items)
  if (rules.compartments && rules.compartments.length > 0) {
    const hasValidCompartment = cart.items.some(
      (item) => item.compartment_id && rules.compartments!.includes(item.compartment_id)
    );

    if (!hasValidCompartment) {
      return {
        valid: false,
        reason: 'Campaign not valid for selected compartments',
      };
    }
  }

  return { valid: true };
}

function evaluateProductRules(
  rules: CampaignProductRules,
  cart: Cart
): EvaluationResult {
  // Product ID check
  if (rules.product_ids && rules.product_ids.length > 0) {
    const hasValidProduct = cart.items.some((item) =>
      rules.product_ids!.includes(item.product_id)
    );

    if (!hasValidProduct) {
      return {
        valid: false,
        reason: 'Campaign not valid for selected products',
      };
    }
  }

  // Category check (requires product metadata - simplified here)
  // In production, you'd fetch product.category from product service
  if (rules.categories && rules.categories.length > 0) {
    // This would require product service integration
    // For now, we'll skip if categories are specified without product metadata
  }

  // Brand check (requires product metadata - simplified here)
  if (rules.brands && rules.brands.length > 0) {
    // This would require product service integration
    // For now, we'll skip if brands are specified without product metadata
  }

  return { valid: true };
}

function evaluateUserRules(
  rules: CampaignUserRules,
  context: EvaluationContext
): EvaluationResult {
  if (!context.user_id && (rules.first_time_only || rules.returning_only || rules.b2b_only || rules.user_ids)) {
    return {
      valid: false,
      reason: 'User authentication required for this campaign',
    };
  }

  // First-time only check
  if (rules.first_time_only) {
    if (!context.booking_context?.is_first_time) {
      return {
        valid: false,
        reason: 'Campaign only valid for first-time customers',
      };
    }
  }

  // Returning only check
  if (rules.returning_only) {
    if (context.booking_context?.is_first_time) {
      return {
        valid: false,
        reason: 'Campaign only valid for returning customers',
      };
    }
  }

  // B2B only check
  if (rules.b2b_only) {
    if (!context.booking_context?.is_b2b) {
      return {
        valid: false,
        reason: 'Campaign only valid for business customers',
      };
    }
  }

  // Specific user IDs check
  if (rules.user_ids && rules.user_ids.length > 0) {
    if (!context.user_id || !rules.user_ids.includes(context.user_id)) {
      return {
        valid: false,
        reason: 'Campaign not valid for your account',
      };
    }
  }

  return { valid: true };
}

function evaluateBookingRules(
  rules: CampaignBookingRules,
  context: EvaluationContext
): EvaluationResult {
  const cart = context.cart;

  // Min order value check
  if (rules.min_order_value !== undefined) {
    if (cart.subtotal < rules.min_order_value) {
      return {
        valid: false,
        reason: `Minimum order value of €${(rules.min_order_value / 100).toFixed(2)} required`,
      };
    }
  }

  // Duration checks
  const bookingDuration = context.booking_context?.booking_duration_minutes ||
    cart.items.reduce((sum, item) => sum + item.duration_minutes, 0);

  if (rules.min_duration !== undefined) {
    if (bookingDuration < rules.min_duration) {
      return {
        valid: false,
        reason: `Minimum booking duration of ${Math.ceil(rules.min_duration / 60)} hours required`,
      };
    }
  }

  if (rules.max_duration !== undefined) {
    if (bookingDuration > rules.max_duration) {
      return {
        valid: false,
        reason: `Maximum booking duration of ${Math.ceil(rules.max_duration / 60)} hours exceeded`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates campaign rules structure
 */
export function validateCampaignRules(rules: CampaignRules): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rules.time?.date_range) {
    const { from, to } = rules.time.date_range;
    if (new Date(from) >= new Date(to)) {
      errors.push('Date range "from" must be before "to"');
    }
  }

  if (rules.time?.weekdays) {
    const invalid = rules.time.weekdays.filter(d => d < 0 || d > 6);
    if (invalid.length > 0) {
      errors.push(`Invalid weekdays: ${invalid.join(', ')}. Must be 0-6`);
    }
  }

  if (rules.time?.time_windows) {
    for (const window of rules.time_windows) {
      if (!/^\d{2}:\d{2}$/.test(window.start) || !/^\d{2}:\d{2}$/.test(window.end)) {
        errors.push(`Invalid time window format: ${window.start}-${window.end}. Use HH:mm format`);
      }
    }
  }

  if (rules.booking?.min_order_value !== undefined && rules.booking.min_order_value < 0) {
    errors.push('min_order_value must be >= 0');
  }

  if (rules.booking?.min_duration !== undefined && rules.booking.min_duration < 0) {
    errors.push('min_duration must be >= 0');
  }

  if (rules.booking?.max_duration !== undefined && rules.booking.max_duration < 0) {
    errors.push('max_duration must be >= 0');
  }

  if (
    rules.booking?.min_duration !== undefined &&
    rules.booking?.max_duration !== undefined &&
    rules.booking.min_duration > rules.booking.max_duration
  ) {
    errors.push('min_duration must be <= max_duration');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
