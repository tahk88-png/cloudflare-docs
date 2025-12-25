import { z } from 'zod';

/**
 * JSON-LD Product schema for SEO
 */
export function generateProductSchema(product: {
	name: string;
	description?: string | null;
	images: string[];
	basePrice: number;
	priceUnit: 'hour' | 'day';
	category?: { name: string } | null;
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: product.description || product.name,
		image: product.images,
		category: product.category?.name,
		offers: {
			'@type': 'Offer',
			price: product.basePrice.toString(),
			priceCurrency: 'EUR',
			availability: 'https://schema.org/InStock',
			priceSpecification: {
				'@type': 'UnitPriceSpecification',
				price: product.basePrice.toString(),
				priceCurrency: 'EUR',
				unitCode: product.priceUnit === 'hour' ? 'HUR' : 'DAY',
			},
		},
	};
}
