import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product/ProductCard';
import { getProductAvailability } from '@/lib/availability';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageProps {
	params: Promise<{ categorySlug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getCategory(slug: string) {
	return await prisma.category.findUnique({
		where: { slug },
	});
}

async function getProducts(
	categoryId: string,
	sort: string = 'popular',
	priceMin?: number,
	priceMax?: number,
	unit?: string,
) {
	const where: any = {
		categoryId,
		active: true,
	};

	if (priceMin !== undefined) {
		where.basePrice = { ...where.basePrice, gte: priceMin };
	}
	if (priceMax !== undefined) {
		where.basePrice = { ...where.basePrice, lte: priceMax };
	}
	if (unit) {
		where.priceUnit = unit;
	}

	const orderBy: any = {};
	if (sort === 'price-asc') {
		orderBy.basePrice = 'asc';
	} else if (sort === 'price-desc') {
		orderBy.basePrice = 'desc';
	} else if (sort === 'newest') {
		orderBy.createdAt = 'desc';
	} else {
		// popular (default)
		orderBy.updatedAt = 'desc';
	}

	return await prisma.product.findMany({
		where,
		include: {
			category: true,
		},
		orderBy,
	});
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
	const { categorySlug } = await params;
	const category = await getCategory(categorySlug);

	if (!category) {
		return {
			title: 'Kategooria ei leitud | Rentbox',
		};
	}

	return {
		title: `${category.name} | Rentbox`,
		description: category.description || `${category.name} tööriistad 24/7`,
	};
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
	const { categorySlug } = await params;
	const search = await searchParams;
	const category = await getCategory(categorySlug);

	if (!category) {
		notFound();
	}

	const sort = (search.sort as string) || 'popular';
	const priceMin = search.priceMin ? parseFloat(search.priceMin as string) : undefined;
	const priceMax = search.priceMax ? parseFloat(search.priceMax as string) : undefined;
	const unit = search.unit as string | undefined;

	const products = await getProducts(category.id, sort, priceMin, priceMax, unit);

	// Get availability for all products
	const productsWithAvailability = await Promise.all(
		products.map(async (product) => {
			const availability = await getProductAvailability(product.id);
			return {
				...product,
				availability,
			};
		}),
	);

	return (
		<div className="min-h-screen bg-background">
			{/* Breadcrumbs */}
			<div className="border-b bg-card">
				<div className="container mx-auto px-4 py-4">
					<nav className="flex items-center gap-2 text-sm">
						<Link href="/tooriistad" className="text-muted-foreground hover:text-foreground">
							Tööriistad
						</Link>
						<ChevronRight className="h-4 w-4 text-muted-foreground" />
						<span className="text-foreground">{category.name}</span>
					</nav>
				</div>
			</div>

			{/* Header */}
			<section className="border-b bg-card py-12">
				<div className="container mx-auto px-4">
					<h1 className="mb-4 text-4xl font-bold">{category.name}</h1>
					{category.description && (
						<p className="text-lg text-muted-foreground">{category.description}</p>
					)}
				</div>
			</section>

			{/* Filters & Sort */}
			<section className="border-b bg-card py-4">
				<div className="container mx-auto px-4">
					<div className="flex flex-wrap items-center gap-4">
						<Select defaultValue={sort}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Sorteeri" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="popular">Populaarsed</SelectItem>
								<SelectItem value="price-asc">Hind ↑</SelectItem>
								<SelectItem value="price-desc">Hind ↓</SelectItem>
								<SelectItem value="newest">Uusimad</SelectItem>
							</SelectContent>
						</Select>

						<Select defaultValue={unit || 'all'}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Ühik" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Kõik</SelectItem>
								<SelectItem value="hour">Tund</SelectItem>
								<SelectItem value="day">Päev</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>

			{/* Products Grid */}
			<section className="py-12">
				<div className="container mx-auto px-4">
					{productsWithAvailability.length === 0 ? (
						<div className="py-12 text-center">
							<p className="text-muted-foreground">Selles kategoorias pole hetkel tööriistu.</p>
						</div>
					) : (
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
									categorySlug={category.slug}
								/>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
