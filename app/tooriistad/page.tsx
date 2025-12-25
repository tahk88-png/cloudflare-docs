import { prisma } from '@/lib/db';
import { ProductCard } from '@/components/product/ProductCard';
import { getProductAvailability } from '@/lib/availability';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Tööriistad 24/7 | Rentbox',
	description: 'Professionaalsed tööriistad. Kohene kättesaamine.',
};

async function getCategories() {
	return await prisma.category.findMany({
		where: { active: true },
		orderBy: { order: 'asc' },
	});
}

async function getFeaturedProducts() {
	return await prisma.product.findMany({
		where: { active: true },
		take: 6,
		orderBy: { updatedAt: 'desc' },
		include: {
			category: true,
		},
	});
}

export default async function ToolsPage() {
	const [categories, featuredProducts] = await Promise.all([
		getCategories(),
		getFeaturedProducts(),
	]);

	// Get availability for featured products
	const productsWithAvailability = await Promise.all(
		featuredProducts.map(async (product) => {
			const availability = await getProductAvailability(product.id);
			return {
				...product,
				availability,
			};
		}),
	);

	return (
		<div className="min-h-screen bg-background">
			{/* Hero */}
			<section className="border-b bg-card py-16 md:py-24">
				<div className="container mx-auto px-4">
					<div className="mx-auto max-w-3xl text-center">
						<h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
							Tööriistad 24/7
						</h1>
						<p className="mb-8 text-lg text-muted-foreground md:text-xl">
							Professionaalsed tööriistad. Kohene kättesaamine.
						</p>

						{/* Search */}
						<div className="mx-auto max-w-md">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Otsi tööriista..."
									className="pl-10"
								/>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Categories */}
			<section className="py-12">
				<div className="container mx-auto px-4">
					<h2 className="mb-8 text-2xl font-semibold">Kategooriad</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{categories.map((category) => (
							<Link
								key={category.id}
								href={`/tooriistad/${category.slug}`}
								className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md"
							>
								<div className="mb-3 text-3xl">{category.icon || '🔧'}</div>
								<h3 className="mb-2 text-lg font-semibold">{category.name}</h3>
								{category.description && (
									<p className="text-sm text-muted-foreground">{category.description}</p>
								)}
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* Featured Products */}
			{productsWithAvailability.length > 0 && (
				<section className="border-t py-12">
					<div className="container mx-auto px-4">
						<h2 className="mb-8 text-2xl font-semibold">Soovitatud tööriistad</h2>
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{productsWithAvailability.map((product) => (
								<ProductCard
									key={product.id}
									id={product.id}
									slug={product.slug}
									name={product.name}
									shortDescription={product.shortDescription}
									image={product.images[0]}
									basePrice={Number(product.basePrice)}
									priceUnit={product.priceUnit as 'hour' | 'day'}
									availability={product.availability}
									categorySlug={product.category?.slug || ''}
								/>
							))}
						</div>
					</div>
				</section>
			)}
		</div>
	);
}
