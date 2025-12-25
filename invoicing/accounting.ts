// Accounting utilities: VAT calculation, rounding, credit notes

import type { InvoiceItem } from './types';

export class AccountingService {
	/**
	 * Calculate invoice totals with proper VAT and rounding
	 */
	static calculateTotals(
		items: Array<{
			quantity: number;
			unit_price: number;
			vat_rate: number;
		}>,
		defaultVatRate: number = 0
	): {
		subtotal: number;
		vat_amount: number;
		total: number;
		items: InvoiceItem[];
	} {
		let subtotal = 0;
		let vatAmount = 0;

		const calculatedItems: InvoiceItem[] = items.map((item, idx) => {
			const vatRate = item.vat_rate ?? defaultVatRate;
			
			// Calculate line totals with proper rounding
			const lineTotal = this.roundToTwoDecimals(item.quantity * item.unit_price);
			const lineVat = this.roundToTwoDecimals(lineTotal * vatRate);
			const lineTotalWithVat = this.roundToTwoDecimals(lineTotal + lineVat);

			subtotal += lineTotal;
			vatAmount += lineVat;

			return {
				description: item.description || '',
				quantity: item.quantity,
				unit_price: item.unit_price,
				vat_rate: vatRate,
				line_total: lineTotal,
				line_vat: lineVat,
				line_total_with_vat: lineTotalWithVat,
				sort_order: idx,
			} as InvoiceItem;
		});

		// Round totals to 2 decimal places
		subtotal = this.roundToTwoDecimals(subtotal);
		vatAmount = this.roundToTwoDecimals(vatAmount);
		const total = this.roundToTwoDecimals(subtotal + vatAmount);

		return {
			subtotal,
			vat_amount: vatAmount,
			total,
			items: calculatedItems,
		};
	}

	/**
	 * Round to 2 decimal places (accounting standard)
	 */
	static roundToTwoDecimals(value: number): number {
		return Math.round(value * 100) / 100;
	}

	/**
	 * Validate VAT rate (must be 0, 0.09, or 0.22)
	 */
	static validateVatRate(rate: number): boolean {
		return rate === 0 || rate === 0.09 || rate === 0.22;
	}

	/**
	 * Calculate credit note amount
	 * Can be full or partial credit
	 */
	static calculateCreditAmount(
		invoiceTotal: number,
		creditPercentage: number = 100
	): number {
		if (creditPercentage < 0 || creditPercentage > 100) {
			throw new Error('Credit percentage must be between 0 and 100');
		}
		return this.roundToTwoDecimals((invoiceTotal * creditPercentage) / 100);
	}

	/**
	 * Check if invoice is overdue
	 */
	static isOverdue(dueDate: number): boolean {
		return Math.floor(Date.now() / 1000) > dueDate;
	}

	/**
	 * Calculate days until due date (negative if overdue)
	 */
	static daysUntilDue(dueDate: number): number {
		const now = Math.floor(Date.now() / 1000);
		const diff = dueDate - now;
		return Math.floor(diff / 86400); // 86400 seconds in a day
	}
}
