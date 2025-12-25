import { getProductBySlug } from '@/lib/catalog/data'
import { BookingPanel } from '@/components/catalog/BookingPanel'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'

type Props = {
  params: Promise<{ categorySlug: string; productSlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { categorySlug, productSlug } = await params
  const product = await getProductBySlug(categorySlug, productSlug)
  if (!product) return {}
  return {
    title: `${product.name} | Rentbox.ee`,
    description: product.short_description
  }
}

export default async function ProductPage({ params }: Props) {
  const { categorySlug, productSlug } = await params
  const product = await getProductBySlug(categorySlug, productSlug)

  if (!product) notFound()

  const unitLabel = product.price_unit === 'hour' ? 'tund' : 'päev'
  const activeCompartments = product.compartments.filter(c => c.active)
  
  // Group compartments by locker
  const lockerMap = new Map<string, { name: string, location: string, count: number }>()
  activeCompartments.forEach(c => {
      const locker = c.locker
      if (!lockerMap.has(locker.id)) {
          lockerMap.set(locker.id, { name: locker.name, location: locker.location_text || '', count: 0 })
      }
      lockerMap.get(locker.id)!.count++
  })
  const lockers = Array.from(lockerMap.values())

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.base_price,
      priceCurrency: 'EUR',
      availability: activeCompartments.length > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Breadcrumbs */}
      <div className="text-sm text-[var(--muted)] mb-6">
        <Link href="/tooriistad" className="hover:text-[var(--accent)]">Tööriistad</Link>
        <span className="mx-2">/</span>
        <Link href={`/tooriistad/${categorySlug}`} className="hover:text-[var(--accent)]">{product.category.name}</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-[var(--text)]">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Gallery & Details */}
        <div className="lg:col-span-2 space-y-8">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {/* Image Placeholder */}
                <div className="text-6xl">🛠️</div>
                <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="text-sm">24/7</Badge>
                </div>
            </div>

            <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className="text-xl text-[var(--muted)]">{product.short_description}</p>
            </div>

            <Separator />

            <div>
                <h2 className="text-xl font-semibold mb-4">Toote info</h2>
                <div className="prose max-w-none text-[var(--text)]">
                    <p>{product.description}</p>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Tehnilised andmed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mock specs */}
                    <div className="flex justify-between border-b py-2">
                        <span className="text-[var(--muted)]">Tootja</span>
                        <span className="font-medium">Tootja nimi</span>
                    </div>
                    <div className="flex justify-between border-b py-2">
                        <span className="text-[var(--muted)]">Mudel</span>
                        <span className="font-medium">Mudeli kood</span>
                    </div>
                    <div className="flex justify-between border-b py-2">
                        <span className="text-[var(--muted)]">Kaal</span>
                        <span className="font-medium">2.5 kg</span>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div>
                    <h3 className="font-semibold text-blue-900">Võta kapist, kasuta, tagasta.</h3>
                    <p className="text-blue-800 text-sm mt-1">
                        Sinu rendiaeg algab hetkest, kui avad kapi ukse. Tagastamisel kontrolli, et kõik tarvikud oleksid olemas.
                    </p>
                </div>
            </div>
        </div>

        {/* Right: Booking Panel */}
        <div className="space-y-6">
            <div className="lg:sticky lg:top-8 space-y-6">
                
                {/* Location selector if needed */}
                {lockers.length > 0 && (
                    <div className="space-y-2">
                         <label className="text-sm font-medium">Vali asukoht:</label>
                         <select className="w-full h-10 rounded-md border border-[var(--border)] px-3 bg-white">
                             {lockers.map((locker, i) => (
                                 <option key={i} value={locker.name}>
                                     {locker.name} ({locker.count} saadaval)
                                 </option>
                             ))}
                         </select>
                         <p className="text-xs text-[var(--muted)]">{lockers[0].location}</p>
                    </div>
                )}

                <BookingPanel price={Number(product.base_price)} unit={unitLabel} />
                
                <div className="text-center text-sm text-[var(--muted)]">
                    Probleemide korral helista <a href="tel:+3725555555" className="underline hover:text-[var(--accent)]">kliendituge</a>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
