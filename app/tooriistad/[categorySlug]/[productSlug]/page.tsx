import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getProductAvailability } from '@/lib/availability';
import { formatPrice, calculatePricing } from '@/lib/pricing';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { BookingSection } from '@/components/booking/BookingSection';
import { generateProductSchema } from './schema';

interface PageProps {
	params: Promise<{ categorySlug: string; productSlug: string }>;
}

async function getProduct(slug: string) {
	return await prisma.product.findUnique({
		where: { slug },
		include: {
			category: true,
			compartments: {
				where: { active: true },
				include: {
					locker: true,
				},
			},
		},
	});
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ categorySlug: string; productSlug: string }>;
}): Promise<Metadata> {
	const { productSlug } = await params;
	const product = await getProduct(productSlug);

	if (!product) {
		return {
			title: 'Tööriist ei leitud | Rentbox',
		};
	}

	return {
		title: `${product.name} | Rentbox`,
		description: product.shortDescription || product.description || `${product.name} rendiks`,
	};
}

export default async function ProductPage({ params }: PageProps) {
	const { categorySlug, productSlug } = await params;
	const product = await getProduct(productSlug);

	if (!product) {
		notFound();
	}

	const availability = await getProductAvailability(product.id);

	const productSchema = generateProductSchema({
		name: product.name,
		description: product.description || product.shortDescription,
		images: product.images,
		basePrice: Number(product.basePrice),
		priceUnit: product.priceUnit as 'hour' | 'day',
		category: product.category,
	});

	return (
		<div className="min-h-screen bg-background">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
			/>
			{/* Breadcrumbs */}
			<div className="border-b bg-card">
				<div className="container mx-auto px-4 py-4">
					<nav className="flex items-center gap-2 text-sm">
						<Link href="/tooriistad" className="text-muted-foreground hover:text-foreground">
							Tööriistad
						</Link>
						<ChevronRight className="h-4 w-4 text-muted-foreground" />
						<Link
							href={`/tooriistad/${categorySlug}`}
							className="text-muted-foreground hover:text-foreground"
						>
							{product.category?.name}
						</Link>
						<ChevronRight className="h-4 w-4 text-muted-foreground" />
						<span className="text-foreground">{product.name}</span>
					</nav>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="grid gap-8 lg:grid-cols-2">
					{/* Left: Images & Info */}
					<div>
						{/* Gallery */}
						<div className="mb-6">
							{product.images && product.images.length > 0 ? (
								<div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
									<Image
										src={product.images[0]}
										alt={product.name}
										fill
										className="object-cover"
										priority
									/>
								</div>
							) : (
								<div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted">
									<Package className="h-24 w-24 text-muted-foreground" />
								</div>
							)}
						</div>

						{/* Product Info */}
						<div className="space-y-6">
							<div>
								<h1 className="mb-4 text-3xl font-bold">{product.name}</h1>
								{product.shortDescription && (
									<p className="text-lg text-muted-foreground">{product.shortDescription}</p>
								)}
							</div>

							{/* Availability */}
							<div className="flex items-center gap-4">
								<Badge
									variant={
										availability.status === 'available'
											? 'success'
											: availability.status === 'limited'
												? 'warning'
												: 'secondary'
									}
								>
									{availability.hint}
								</Badge>
								{availability.nextAvailable && (
									<span className="text-sm text-muted-foreground">
										{availability.hint}
									</span>
								)}
							</div>

							{/* Price */}
							<div>
								<p className="text-3xl font-bold">
									{formatPrice(Number(product.basePrice), product.priceUnit as 'hour' | 'day')}
								</p>
							</div>

							<Separator />

							{/* Description */}
							{product.description && (
								<div>
									<h2 className="mb-2 text-xl font-semibold">Kirjeldus</h2>
									<p className="text-muted-foreground whitespace-pre-line">
										{product.description}
									</p>
								</div>
							)}

							{/* Specs */}
							<div>
								<h2 className="mb-4 text-xl font-semibold">Tehnilised andmed</h2>
								<Table>
									<TableBody>
										<TableRow>
											<TableHead className="w-[200px]">Kategooria</TableHead>
											<TableCell>{product.category?.name || '-'}</TableCell>
										</TableRow>
										<TableRow>
											<TableHead>Minimaalne rendiaeg</TableHead>
											<TableCell>{product.minRentalMinutes} minutit</TableCell>
										</TableRow>
										{product.maxRentalMinutes && (
											<TableRow>
												<TableHead>Maksimaalne rendiaeg</TableHead>
												<TableCell>{product.maxRentalMinutes} minutit</TableCell>
											</TableRow>
										)}
										<TableRow>
											<TableHead>Ajagraafik</TableHead>
											<TableCell>{product.slotMinutes} minuti sammud</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</div>

							{/* Trust Line */}
							<div className="rounded-lg border bg-muted/50 p-4">
								<p className="text-center text-sm font-medium">
									Võta kapist. Kasuta. Tagasta.
								</p>
							</div>
						</div>
					</div>

					{/* Right: Booking */}
					<div className="lg:sticky lg:top-4 lg:h-fit">
						<BookingSection
							product={product}
							availability={availability}
							compartments={product.compartments}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
