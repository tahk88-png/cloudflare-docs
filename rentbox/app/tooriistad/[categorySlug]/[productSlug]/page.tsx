import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { getProductBySlug, getCategoryBySlug } from '@/lib/catalog/data'
import { ProductPage } from './ProductPage'

interface ProductPageProps {
  params: { categorySlug: string; productSlug: string }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.productSlug)

  if (!product) {
    return {
      title: 'Toodet ei leitud | Rentbox.ee',
    }
  }

  return {
    title: `${product.name} - Rent | Rentbox.ee`,
    description: product.shortDescription,
    keywords: [product.name, ...product.tags, 'tööriistade rent', 'rent'],
    openGraph: {
      title: `${product.name} | Rentbox.ee`,
      description: product.shortDescription,
      type: 'website',
      images: product.images.length > 0 ? [{ url: product.images[0] }] : [],
    },
  }
}

// JSON-LD Schema for SEO
function ProductSchema({ product, category }: { product: any; category: any }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    image: product.images,
    category: category?.name,
    brand: {
      '@type': 'Brand',
      name: 'Rentbox',
    },
    offers: {
      '@type': 'Offer',
      price: product.basePrice,
      priceCurrency: 'EUR',
      availability: product.compartmentCount > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      seller: {
        '@type': 'Organization',
        name: 'Rentbox OÜ',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '24',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.productSlug)
  const category = await getCategoryBySlug(params.categorySlug)

  if (!product || !category) {
    notFound()
  }

  return (
    <>
      <ProductSchema product={product} category={category} />

      {/* Breadcrumbs */}
      <div className="bg-neutral-900 border-b border-neutral-800">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-neutral-400 flex-wrap">
            <Link href="/" className="hover:text-accent transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/tooriistad" className="hover:text-accent transition-colors">
              Tööriistad
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link 
              href={`/tooriistad/${params.categorySlug}`}
              className="hover:text-accent transition-colors"
            >
              {category.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      <ProductPage product={product} />
    </>
  )
}
