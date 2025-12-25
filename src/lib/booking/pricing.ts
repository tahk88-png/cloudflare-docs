// Pricing Engine (LUKKU)
// Dynamic pricing with peak hours, weekends, discounts

import type { Product, PriceBreakdown } from './types';
import { differenceInHours, differenceInDays, isWeekend, parse, format } from 'date-fns';

export interface PricingConfig {
	product: Product;
	start_at: Date;
	end_at: Date;
}

/**
 * Calculate rental price breakdown
 */
export function calculatePrice(config: PricingConfig): PriceBreakdown {
	const { product, start_at, end_at } = config;

	// Calculate duration
	const hours = differenceInHours(end_at, start_at);
	const days = differenceInDays(end_at, start_at);
	const isLongRental = hours >= product.long_rental_discount_threshold_hours;

	// Base price calculation
	// Use daily rate if rental is >= 1 day, otherwise hourly
	const basePrice = days >= 1
		? product.base_price_per_day * days
		: product.base_price_per_hour * hours;

	// Parse peak hours
	const peakStart = parse(product.peak_hours_start, 'HH:mm', new Date());
	const peakEnd = parse(product.peak_hours_end, 'HH:mm', new Date());
	const peakStartHour = peakStart.getHours();
	const peakEndHour = peakEnd.getHours();

	// Calculate peak hours surcharge
	let peakHoursSurcharge = 0;
	let peakHoursCount = 0;

	// Iterate through each hour of the rental
	for (let i = 0; i < hours; i++) {
		const currentHour = new Date(start_at);
		currentHour.setHours(start_at.getHours() + i);

		const hourOfDay = currentHour.getHours();
		const isPeakHour = hourOfDay >= peakStartHour && hourOfDay < peakEndHour;

		if (isPeakHour) {
			peakHoursCount++;
		}
	}

	if (peakHoursCount > 0) {
		const peakHoursPrice = (product.base_price_per_hour * peakHoursCount);
		peakHoursSurcharge = peakHoursPrice * (product.peak_hours_multiplier - 1);
	}

	// Weekend surcharge
	let weekendSurcharge = 0;
	if (isWeekend(start_at) || isWeekend(end_at)) {
		// Apply weekend multiplier to base price
		weekendSurcharge = basePrice * (product.weekend_multiplier - 1);
	}

	// Subtotal before discount
	const subtotalBeforeDiscount = basePrice + peakHoursSurcharge + weekendSurcharge;

	// Long rental discount
	let longRentalDiscount = 0;
	if (isLongRental && product.long_rental_discount_percent > 0) {
		longRentalDiscount = Math.floor(
			subtotalBeforeDiscount * (product.long_rental_discount_percent / 100)
		);
	}

	// Final subtotal
	const subtotal = subtotalBeforeDiscount - longRentalDiscount;

	// Deposit
	const deposit = product.deposit_amount;

	// Total (subtotal + deposit, deposit is refunded on return)
	const total = subtotal + deposit;

	// Build breakdown items
	const breakdownItems: PriceBreakdown['breakdown_items'] = [
		{
			label: 'Base Price',
			amount: basePrice,
			description: days >= 1 
				? `${days} day(s) × €${(product.base_price_per_day / 100).toFixed(2)}`
				: `${hours} hour(s) × €${(product.base_price_per_hour / 100).toFixed(2)}`,
		},
	];

	if (peakHoursSurcharge > 0) {
		breakdownItems.push({
			label: 'Peak Hours Surcharge',
			amount: peakHoursSurcharge,
			description: `${peakHoursCount} peak hour(s) × ${((product.peak_hours_multiplier - 1) * 100).toFixed(0)}%`,
		});
	}

	if (weekendSurcharge > 0) {
		breakdownItems.push({
			label: 'Weekend Surcharge',
			amount: weekendSurcharge,
			description: `${((product.weekend_multiplier - 1) * 100).toFixed(0)}% surcharge`,
		});
	}

	if (longRentalDiscount > 0) {
		breakdownItems.push({
			label: 'Long Rental Discount',
			amount: -longRentalDiscount,
			description: `${product.long_rental_discount_percent}% off for ${hours}h+ rental`,
		});
	}

	breakdownItems.push({
		label: 'Deposit',
		amount: deposit,
		description: 'Refunded on return',
	});

	return {
		base_price: basePrice,
		peak_hours_surcharge: peakHoursSurcharge,
		weekend_surcharge: weekendSurcharge,
		long_rental_discount: longRentalDiscount,
		subtotal,
		deposit,
		total,
		currency: 'EUR',
		hours,
		days,
		breakdown_items: breakdownItems,
	};
}

/**
 * Format price in cents to display string
 */
export function formatPrice(cents: number, currency: string = 'EUR'): string {
	return new Intl.NumberFormat('et-EE', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
	}).format(cents / 100);
}
