import { Metadata } from 'next';
import { prisma } from '@/lib/db';

interface LayoutProps {
	params: Promise<{ categorySlug: string; productSlug: string }>;
	children: React.ReactNode;
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ categorySlug: string; productSlug: string }>;
}): Promise<Metadata> {
	const { productSlug } = await params;
	const product = await prisma.product.findUnique({
		where: { slug: productSlug },
		include: { category: true },
	});

	if (!product) {
		return {
			title: 'Tööriist ei leitud | Rentbox',
		};
	}

	return {
		title: `${product.name} | Rentbox`,
		description: product.shortDescription || product.description || `${product.name} rendiks`,
		openGraph: {
			title: `${product.name} | Rentbox`,
			description: product.shortDescription || product.description || `${product.name} rendiks`,
			type: 'product',
			images: product.images.length > 0 ? [product.images[0]] : [],
		},
	};
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
