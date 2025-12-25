import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'EUR'): string {
	const num = typeof amount === 'string' ? parseFloat(amount) : amount;
	return new Intl.NumberFormat('et-EE', {
		style: 'currency',
		currency,
	}).format(num);
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'datetime' = 'short'): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	
	if (format === 'datetime') {
		return new Intl.DateTimeFormat('et-EE', {
			dateStyle: 'short',
			timeStyle: 'short',
		}).format(d);
	}
	
	if (format === 'long') {
		return new Intl.DateTimeFormat('et-EE', {
			dateStyle: 'long',
		}).format(d);
	}
	
	return new Intl.DateTimeFormat('et-EE', {
		dateStyle: 'short',
	}).format(d);
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
