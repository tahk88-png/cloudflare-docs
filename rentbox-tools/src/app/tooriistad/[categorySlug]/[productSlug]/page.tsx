import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCategoryBySlug,
  getProductBySlug,
  getAvailabilityLabel,
  getAvailabilityVariant,
  getLockers,
} from "@/lib/catalog/data";
import { formatPrice, getPriceUnitLabel } from "@/lib/utils";
import { CheckCircle, Package, Clock, MapPin } from "lucide-react";

interface ProductPageProps {
  params: Promise<{ categorySlug: string; productSlug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { categorySlug, productSlug } = await params;
  const product = await getProductBySlug(categorySlug, productSlug);

  if (!product) {
    return {
      title: "Toode ei leitud",
    };
  }

  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} | Rentbox.ee`,
      description: product.shortDescription,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
    // JSON-LD Product schema
    other: {
      "script:ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.shortDescription,
        image: product.images[0],
        offers: {
          "@type": "Offer",
          price: product.basePrice,
          priceCurrency: "EUR",
          availability:
            product.availabilityStatus === "unavailable"
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
        },
      }),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { categorySlug, productSlug } = await params;
  const [product, category, lockers] = await Promise.all([
    getProductBySlug(categorySlug, productSlug),
    getCategoryBySlug(categorySlug),
    getLockers(),
  ]);

  if (!product || !category) {
    notFound();
  }

  const availabilityLabel = getAvailabilityLabel(product.availabilityStatus);
  const availabilityVariant = getAvailabilityVariant(product.availabilityStatus);
  const priceUnitLabel = getPriceUnitLabel(product.priceUnit);
  const isUnavailable = product.availabilityStatus === "unavailable";
  const hasMultipleLockers = lockers.length > 1;

  return (
    <main className="flex-1 py-6 sm:py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Tööriistad", href: "/tooriistad" },
            { label: category.name, href: `/tooriistad/${category.slug}` },
            { label: product.name },
          ]}
        />

        {/* Product Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gallery Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-card">
              {product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl text-muted">
                  🔧
                </div>
              )}

              {/* Badges */}
              <div className="absolute left-3 top-3 flex gap-2">
                <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
                  24/7
                </Badge>
                <Badge variant={availabilityVariant}>{availabilityLabel}</Badge>
              </div>
            </div>

            {/* Thumbnail Gallery (if multiple images) */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-border hover:border-accent transition-colors"
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - pilt ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Title & Category */}
            <div>
              <Link
                href={`/tooriistad/${category.slug}`}
                className="text-sm text-accent hover:underline"
              >
                {category.icon} {category.name}
              </Link>
              <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-2 text-muted">{product.shortDescription}</p>
            </div>

            {/* Trust Line */}
            <div className="flex items-center gap-2 rounded-lg bg-accent/5 px-4 py-3 text-sm">
              <CheckCircle className="h-5 w-5 text-accent" />
              <span className="font-medium text-foreground">
                Võta kapist, kasuta, tagasta.
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                al. {formatPrice(product.basePrice)}€
              </span>
              <span className="text-lg text-muted">/ {priceUnitLabel}</span>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <Separator />

            {/* Location Selector (if multiple lockers) */}
            {hasMultipleLockers && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Vali kapp/asukoht
                </label>
                <Select defaultValue={lockers[0].id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vali asukoht" />
                  </SelectTrigger>
                  <SelectContent>
                    {lockers.map((locker) => (
                      <SelectItem key={locker.id} value={locker.id}>
                        {locker.name} - {locker.locationText}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Booking Panel Placeholder */}
            <Card id="broneeri" className="border-accent/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  Broneeri tööriist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted">
                  Vali sobiv aeg ja broneeri tööriist kohe. Maksad ainult kasutatud
                  aja eest.
                </p>
                <div className="flex gap-3">
                  <Button className="flex-1" size="lg" disabled={isUnavailable}>
                    {isUnavailable ? "Pole hetkel saadaval" : "Broneeri"}
                  </Button>
                  <Button variant="outline" size="lg">
                    Küsi lisainfot
                  </Button>
                </div>
                {isUnavailable && (
                  <p className="text-sm text-muted text-center">
                    See tööriist pole hetkel saadaval. Vaata teisi sarnaseid tööriistu.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Details */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Kirjeldus</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted leading-relaxed">{product.description}</p>
            </CardContent>
          </Card>

          {/* Specs */}
          {product.specs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tehnilised andmed</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {product.specs.map((spec, index) => (
                    <div
                      key={index}
                      className="flex justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                    >
                      <dt className="text-muted">{spec.label}</dt>
                      <dd className="font-medium text-foreground">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* What's included */}
          {product.includes.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Mis komplektis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {product.includes.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              description: product.shortDescription,
              image: product.images[0],
              brand: {
                "@type": "Brand",
                name: product.tags[0] || "Rentbox",
              },
              offers: {
                "@type": "Offer",
                price: product.basePrice,
                priceCurrency: "EUR",
                availability:
                  product.availabilityStatus === "unavailable"
                    ? "https://schema.org/OutOfStock"
                    : "https://schema.org/InStock",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  price: product.basePrice,
                  priceCurrency: "EUR",
                  unitCode: product.priceUnit === "hour" ? "HUR" : "DAY",
                },
              },
            }),
          }}
        />
      </div>
    </main>
  );
}
