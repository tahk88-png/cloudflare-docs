import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/pricing';
import { AvailabilityInfo } from '@/lib/availability';
import { Calendar, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
	id: string;
	slug: string;
	name: string;
	shortDescription?: string | null;
	image?: string | null;
	basePrice: number;
	priceUnit: 'hour' | 'day';
	availability: AvailabilityInfo;
	categorySlug: string;
	className?: string;
}

export function ProductCard({
	id,
	slug,
	name,
	shortDescription,
	image,
	basePrice,
	priceUnit,
	availability,
	categorySlug,
	className,
}: ProductCardProps) {
	const availabilityColors = {
		available: 'success',
		limited: 'warning',
		unavailable: 'secondary',
	} as const;

	return (
		<Card
			className={cn(
				'group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1',
				className,
			)}
		>
			<Link href={`/tooriistad/${categorySlug}/${slug}`} className="block">
				{/* Image */}
				<div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
					{image ? (
						<Image
							src={image}
							alt={name}
							fill
							className="object-cover transition-transform group-hover:scale-105"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						/>
					) : (
						<div className="flex h-full items-center justify-center">
							<Package className="h-12 w-12 text-muted-foreground" />
						</div>
					)}
				</div>

				{/* Content */}
				<div className="p-6">
					{/* Name */}
					<h3 className="mb-2 text-lg font-semibold leading-tight">{name}</h3>

					{/* Description */}
					{shortDescription && (
						<p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
							{shortDescription}
						</p>
					)}

					{/* Availability */}
					<div className="mb-4 flex items-center gap-2">
						<Badge variant={availabilityColors[availability.status]}>
							{availability.hint}
						</Badge>
						{availability.nextAvailable && (
							<span className="text-xs text-muted-foreground">
								{availability.hint}
							</span>
						)}
					</div>

					{/* Price */}
					<div className="mb-4">
						<p className="text-lg font-semibold">{formatPrice(basePrice, priceUnit)}</p>
					</div>

					{/* Actions */}
					<div className="flex gap-2">
						<Button
							asChild
							className="flex-1"
							disabled={availability.status === 'unavailable'}
						>
							<Link href={`/tooriistad/${categorySlug}/${slug}`}>Broneeri</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link href={`/tooriistad/${categorySlug}/${slug}`}>Vaata detaile</Link>
						</Button>
					</div>
				</div>
			</Link>
		</Card>
	);
}
