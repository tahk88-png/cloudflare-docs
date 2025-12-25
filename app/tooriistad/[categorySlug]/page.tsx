import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { CategoryListing } from '@/components/catalog/CategoryListing'
import { SkeletonGrid } from '@/components/catalog/SkeletonGrid'
import { getCategoryBySlug } from '@/lib/catalog/data'

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const category = await getCategoryBySlug(categorySlug)

  if (!category) {
    return {
      title: 'Kategooria ei leitud - Rentbox.ee',
    }
  }

  return {
    title: `${category.name} - Tööriistad - Rentbox.ee`,
    description: category.description || `Vaata ${category.name.toLowerCase()} tööriistu Rentbox.ee-st`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { categorySlug } = await params
  const searchParamsObj = await searchParams
  const category = await getCategoryBySlug(categorySlug)
  
  // Convert searchParams to URLSearchParams format
  const urlSearchParams = new URLSearchParams()
  Object.entries(searchParamsObj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => urlSearchParams.append(key, v))
    } else if (value) {
      urlSearchParams.set(key, value)
    }
  })

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Kategooria ei leitud</h1>
          <Link href="/tooriistad" className="text-[var(--accent)] hover:underline">
            Tagasi kataloogi
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/tooriistad" className="text-[var(--muted)] hover:text-[var(--accent)]">
              Tööriistad
            </Link>
          </li>
          <li className="text-[var(--muted)]">/</li>
          <li className="font-medium">{category.name}</li>
        </ol>
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <div className="mb-2 text-4xl">{category.icon}</div>
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">{category.name}</h1>
        {category.description && (
          <p className="text-lg text-[var(--muted)]">{category.description}</p>
        )}
      </div>

      {/* Category Listing */}
      <Suspense fallback={<SkeletonGrid />}>
        <CategoryListing categorySlug={categorySlug} searchParams={Object.fromEntries(urlSearchParams)} />
      </Suspense>
    </div>
  )
}
