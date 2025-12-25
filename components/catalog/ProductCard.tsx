import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Product, Category, Compartment } from '@prisma/client'

interface ProductCardProps {
  product: Product & { category: Category; compartments: Compartment[] }
}

export function ProductCard({ product }: ProductCardProps) {
  const compartmentCount = product.compartments.filter(c => c.active).length
  let availabilityBadge = <Badge variant="destructive">Pole hetkel</Badge>
  if (compartmentCount > 1) {
    availabilityBadge = <Badge variant="success">Saadaval</Badge>
  } else if (compartmentCount === 1) {
    availabilityBadge = <Badge variant="neutral">Piiratud</Badge>
  }

  // Parse images (assuming JSON string or comma separated)
  let imageUrl = '/placeholder.png'
  try {
    if (product.images) {
      const parsed = JSON.parse(product.images)
      if (Array.isArray(parsed) && parsed.length > 0) imageUrl = parsed[0]
    }
  } catch (e) {
    // fallback
  }

  const unitLabel = product.price_unit === 'hour' ? 'tund' : 'päev'

  return (
    <Link href={`/tooriistad/${product.category.slug}/${product.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col overflow-hidden transition-all hover:shadow-lg hover:border-[var(--accent)]">
        <div className="relative h-48 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {/* Using a placeholder div instead of next/image if image is missing to avoid errors, or standard img */}
             {/* <Image src={imageUrl} alt={product.name} fill className="object-cover transition-transform group-hover:scale-105" /> */}
             <div className="text-4xl">🛠️</div>
             <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-white/90 backdrop-blur text-xs">24/7</Badge>
             </div>
             <div className="absolute top-2 left-2">
                 {availabilityBadge}
             </div>
        </div>
        <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
                <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider">{product.category.name}</Badge>
            </div>
            <CardTitle className="text-lg line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{product.name}</CardTitle>
            <CardDescription className="line-clamp-2 text-xs mt-1 min-h-[2.5em]">{product.short_description}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 grow">
             {/* Spacer */}
        </CardContent>
        <CardFooter className="p-4 border-t border-[var(--border)] flex flex-col gap-3 bg-[var(--bg)]/30">
             <div className="w-full flex justify-between items-end">
                 <div className="flex flex-col">
                     <span className="text-xs text-[var(--muted)]">Hind alates</span>
                     <span className="text-lg font-bold text-[var(--text)]">{Number(product.base_price).toFixed(2)}€ <span className="text-sm font-normal text-[var(--muted)]">/ {unitLabel}</span></span>
                 </div>
             </div>
             <div className="w-full grid grid-cols-2 gap-2">
                 <Button className="w-full" variant="default">Broneeri</Button>
                 <Button className="w-full" variant="outline">Vaata detaile</Button>
             </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
