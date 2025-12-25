import { formatInRentboxTimeZone } from './timezone';

export interface PricingInput {
	basePrice: number;
	priceUnit: 'hour' | 'day';
	startDate: Date;
	endDate: Date;
}

export interface PricingResult {
	basePrice: number;
	weekendMultiplier: number;
	peakHourMultiplier: number;
	longRentalDiscount: number;
	finalPrice: number;
	breakdown: string[];
}

/**
 * Calculate dynamic pricing with weekend, peak-hour, and long-rental discounts
 */
export function calculatePricing(input: PricingInput): PricingResult {
	const { basePrice, priceUnit, startDate, endDate } = input;

	const durationMs = endDate.getTime() - startDate.getTime();
	const durationHours = durationMs / (1000 * 60 * 60);
	const durationDays = durationHours / 24;

	let finalPrice = basePrice;
	const breakdown: string[] = [];

	// Base calculation
	if (priceUnit === 'hour') {
		finalPrice = basePrice * durationHours;
		breakdown.push(`Alus: ${basePrice.toFixed(2)} €/h × ${durationHours.toFixed(1)}h`);
	} else {
		finalPrice = basePrice * Math.ceil(durationDays);
		breakdown.push(`Alus: ${basePrice.toFixed(2)} €/päev × ${Math.ceil(durationDays)} päeva`);
	}

	// Weekend multiplier (Fri 18:00 - Sun 23:59)
	let weekendMultiplier = 1;
	const startDay = startDate.getDay();
	const startHour = startDate.getHours();
	const endDay = endDate.getDay();
	const endHour = endDate.getHours();

	const isWeekendStart = startDay === 5 && startHour >= 18 || startDay === 6 || startDay === 0;
	const isWeekendEnd = endDay === 5 && endHour >= 18 || endDay === 6 || endDay === 0;

	if (isWeekendStart || isWeekendEnd) {
		weekendMultiplier = 1.15; // 15% weekend surcharge
		breakdown.push('Nädalavahetuse lisatasu: +15%');
	}

	// Peak hour multiplier (8:00-10:00, 17:00-19:00)
	let peakHourMultiplier = 1;
	const startHourOnly = startDate.getHours();
	const endHourOnly = endDate.getHours();

	const isPeakStart = (startHourOnly >= 8 && startHourOnly < 10) || (startHourOnly >= 17 && startHourOnly < 19);
	const isPeakEnd = (endHourOnly >= 8 && endHourOnly < 10) || (endHourOnly >= 17 && endHourOnly < 19);

	if (isPeakStart || isPeakEnd) {
		peakHourMultiplier = 1.1; // 10% peak hour surcharge
		breakdown.push('Tipptunni lisatasu: +10%');
	}

	// Long rental discount (2+ days)
	let longRentalDiscount = 0;
	if (durationDays >= 2) {
		longRentalDiscount = 0.1; // 10% discount
		breakdown.push('Pika rendi allahindlus: -10%');
	} else if (durationDays >= 7) {
		longRentalDiscount = 0.15; // 15% discount
		breakdown.push('Pika rendi allahindlus: -15%');
	}

	// Apply multipliers
	finalPrice = finalPrice * weekendMultiplier * peakHourMultiplier;
	
	// Apply discount
	finalPrice = finalPrice * (1 - longRentalDiscount);

	return {
		basePrice,
		weekendMultiplier,
		peakHourMultiplier,
		longRentalDiscount,
		finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
		breakdown,
	};
}

export function formatPrice(price: number, unit: 'hour' | 'day'): string {
	const unitText = unit === 'hour' ? 'tund' : 'päev';
	return `al. ${price.toFixed(2)} € / ${unitText}`;
}
