# Rentbox v2 - UI Component Architecture

> Next.js 14 App Router with Tailwind CSS and shadcn/ui. Server Components by default, Client Components only when necessary.

## Design Principles

1. **Server Components First** - Only use Client Components for interactivity
2. **Progressive Enhancement** - Core functionality works without JavaScript
3. **Accessibility** - WCAG 2.1 AA compliance
4. **Mobile-First** - Responsive from 320px upward
5. **Estonian First** - Default locale is `et-EE`, support `en`, `ru`

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 14 | App Router, SSR, API Routes |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | shadcn/ui | Accessible primitives |
| Forms | React Hook Form + Zod | Validation |
| State | Zustand | Client-side state |
| Data Fetching | TanStack Query | Server state |
| Date/Time | date-fns + date-fns-tz | Timezone handling |
| i18n | next-intl | Internationalization |

---

## Project Structure

```
packages/web/
├── app/
│   ├── (marketing)/           # Public marketing pages
│   │   ├── page.tsx           # Home
│   │   ├── about/
│   │   ├── pricing/
│   │   └── contact/
│   │
│   ├── (auth)/                # Authentication
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── verify-email/
│   │
│   ├── catalog/               # Product browsing
│   │   ├── page.tsx           # Category listing
│   │   ├── [category]/
│   │   │   └── page.tsx       # Category products
│   │   └── [category]/[slug]/
│   │       └── page.tsx       # Product detail
│   │
│   ├── locations/             # Location pages
│   │   ├── page.tsx           # All locations
│   │   └── [slug]/
│   │       └── page.tsx       # Location detail
│   │
│   ├── booking/               # Booking flow
│   │   ├── [product]/
│   │   │   └── page.tsx       # Slot selection
│   │   ├── checkout/
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Payment + signature
│   │   └── confirmed/
│   │       └── [id]/
│   │           └── page.tsx   # Confirmation
│   │
│   ├── dashboard/             # User dashboard "Minu rendid"
│   │   ├── page.tsx           # Overview
│   │   ├── bookings/
│   │   │   ├── page.tsx       # All bookings
│   │   │   └── [id]/
│   │   │       └── page.tsx   # Booking detail
│   │   ├── invoices/
│   │   ├── contracts/
│   │   └── settings/
│   │
│   ├── admin/                 # Admin panel
│   │   ├── layout.tsx         # Admin layout with sidebar
│   │   ├── page.tsx           # Dashboard
│   │   ├── bookings/
│   │   ├── lockers/
│   │   ├── products/
│   │   ├── users/
│   │   ├── incidents/
│   │   └── settings/
│   │
│   ├── api/                   # API routes (webhooks, etc)
│   │   └── webhooks/
│   │
│   ├── layout.tsx             # Root layout
│   ├── error.tsx              # Error boundary
│   ├── not-found.tsx          # 404 page
│   └── loading.tsx            # Loading state
│
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── layout/                # Layout components
│   ├── catalog/               # Catalog-specific
│   ├── booking/               # Booking flow
│   ├── dashboard/             # Dashboard components
│   ├── admin/                 # Admin components
│   └── shared/                # Shared components
│
├── lib/
│   ├── api.ts                 # API client
│   ├── auth.ts                # Auth utilities
│   ├── utils.ts               # Helper functions
│   └── validations/           # Zod schemas
│
├── hooks/                     # Custom hooks
├── stores/                    # Zustand stores
├── types/                     # TypeScript types
└── styles/                    # Global styles
```

---

## Core Components

### Layout Components

#### `RootLayout`

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="et" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-background")}>
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

#### `Header`

```tsx
// components/layout/Header.tsx
export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center">
        <Logo />
        <MainNav />
        <div className="ml-auto flex items-center space-x-4">
          <LocationSelector />
          <LanguageSelector />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
```

#### `AdminLayout`

```tsx
// app/admin/layout.tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1">
        <AdminHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

### Catalog Components

#### `ProductCard`

```tsx
// components/catalog/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  showAvailability?: boolean;
}

export function ProductCard({ product, showAvailability }: ProductCardProps) {
  return (
    <Card className="group overflow-hidden">
      <div className="relative aspect-square">
        <Image
          src={product.images[0]?.url}
          alt={product.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        {showAvailability && (
          <AvailabilityBadge available={product.availability.available_now} />
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold truncate">{product.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.short_description}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <PriceDisplay
            daily={product.pricing.daily_rate}
            hourly={product.pricing.hourly_rate}
          />
          <Button size="sm" asChild>
            <Link href={`/catalog/${product.category.slug}/${product.slug}`}>
              Rendi
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### `ProductDetail`

```tsx
// components/catalog/ProductDetail.tsx
interface ProductDetailProps {
  product: ProductWithDetails;
  locations: Location[];
}

export function ProductDetail({ product, locations }: ProductDetailProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Image Gallery */}
      <ProductGallery images={product.images} videos={product.videos} />

      {/* Product Info */}
      <div className="space-y-6">
        <div>
          <Breadcrumb items={[
            { label: 'Kataloog', href: '/catalog' },
            { label: product.category.name, href: `/catalog/${product.category.slug}` },
            { label: product.name }
          ]} />
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
        </div>

        {/* Pricing */}
        <PricingTable pricing={product.pricing} />

        {/* Quick Booking */}
        <QuickBookingForm product={product} locations={locations} />

        {/* Specifications */}
        <Specifications specs={product.specifications} />

        {/* Documents */}
        <ProductDocuments documents={product.documents} />
      </div>
    </div>
  );
}
```

#### `AvailabilityCalendar`

```tsx
// components/catalog/AvailabilityCalendar.tsx
"use client";

interface AvailabilityCalendarProps {
  productId: string;
  locationId: string;
  onSlotSelect: (slot: TimeSlot) => void;
}

export function AvailabilityCalendar({
  productId,
  locationId,
  onSlotSelect,
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { data: availability, isLoading } = useAvailability({
    productId,
    locationId,
    date: selectedDate,
  });

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        disabled={(date) => date < new Date()}
        className="rounded-md border"
      />

      {/* Time Slots */}
      <div className="grid grid-cols-4 gap-2">
        {isLoading ? (
          <TimeSlotsSkeleton />
        ) : (
          availability?.slots.map((slot) => (
            <TimeSlotButton
              key={slot.start}
              slot={slot}
              onClick={() => onSlotSelect(slot)}
            />
          ))
        )}
      </div>

      {/* Next Available */}
      {availability?.next_available && (
        <NextAvailablePrompt
          nextAvailable={availability.next_available}
          onSelect={() => {
            setSelectedDate(new Date(availability.next_available.start));
          }}
        />
      )}
    </div>
  );
}
```

---

### Booking Components

#### `BookingFlow`

```tsx
// components/booking/BookingFlow.tsx
"use client";

type BookingStep = 'select' | 'review' | 'sign' | 'pay' | 'confirmed';

export function BookingFlow({ product, location }: BookingFlowProps) {
  const [step, setStep] = useState<BookingStep>('select');
  const [booking, setBooking] = useState<BookingDraft | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <BookingProgress currentStep={step} />

      {/* Step Content */}
      {step === 'select' && (
        <SlotSelectionStep
          product={product}
          location={location}
          onComplete={(draft) => {
            setBooking(draft);
            setStep('review');
          }}
        />
      )}

      {step === 'review' && booking && (
        <ReviewStep
          booking={booking}
          onBack={() => setStep('select')}
          onComplete={() => setStep('sign')}
        />
      )}

      {step === 'sign' && booking && (
        <SignatureStep
          booking={booking}
          onBack={() => setStep('review')}
          onComplete={() => setStep('pay')}
        />
      )}

      {step === 'pay' && booking && (
        <PaymentStep
          booking={booking}
          onComplete={() => setStep('confirmed')}
        />
      )}

      {step === 'confirmed' && booking && (
        <ConfirmationStep booking={booking} />
      )}
    </div>
  );
}
```

#### `SlotSelectionStep`

```tsx
// components/booking/SlotSelectionStep.tsx
"use client";

export function SlotSelectionStep({
  product,
  location,
  onComplete,
}: SlotSelectionStepProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(24); // hours
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = useMutation({
    mutationFn: (params) => api.checkAvailability(params),
    onSuccess: (data) => {
      if (data.available) {
        onComplete({
          productId: product.id,
          locationId: location.id,
          compartmentId: data.compartment.id,
          startAt: startDate!,
          endAt: addHours(startDate!, duration),
          pricing: data.pricing_estimate,
        });
      } else {
        setError(data.conflict.message);
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vali aeg</CardTitle>
        <CardDescription>
          Vali sobiv kuupäev ja kestus {product.name} rentimiseks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div>
          <Label>Alguskuupäev ja -aeg</Label>
          <DateTimePicker
            value={startDate}
            onChange={setStartDate}
            minDate={new Date()}
            minTime="08:00"
            maxTime="22:00"
          />
        </div>

        {/* Duration Selection */}
        <div>
          <Label>Kestus</Label>
          <DurationSelector
            value={duration}
            onChange={setDuration}
            min={product.rental_rules.min_rental_hours}
            max={product.rental_rules.max_rental_days * 24}
          />
        </div>

        {/* Price Preview */}
        {startDate && (
          <PricePreview
            pricing={product.pricing}
            duration={duration}
          />
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={!startDate || checkAvailability.isPending}
          onClick={() => {
            checkAvailability.mutate({
              productId: product.id,
              locationId: location.id,
              startAt: startDate!.toISOString(),
              endAt: addHours(startDate!, duration).toISOString(),
            });
          }}
        >
          {checkAvailability.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Kontrolli saadavust
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### `SignatureStep`

```tsx
// components/booking/SignatureStep.tsx
"use client";

export function SignatureStep({
  booking,
  onBack,
  onComplete,
}: SignatureStepProps) {
  const [signatureType, setSignatureType] = useState<SignatureType>('typed');
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const requiresStrongAuth = 
    booking.total > 200 || 
    booking.durationDays > 7 ||
    booking.user.type === 'business';

  const signContract = useMutation({
    mutationFn: (params) => api.signContract(params),
    onSuccess: onComplete,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendilepingu allkirjastamine</CardTitle>
        <CardDescription>
          Palun loe läbi renditingimused ja allkirjasta leping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Preview */}
        <ContractPreview booking={booking} />

        {/* Signature Type Selection */}
        {requiresStrongAuth ? (
          <Alert>
            <AlertDescription>
              Selle rendilepingu jaoks on vajalik tugev autentimine 
              (Smart-ID, Mobiil-ID või ID-kaart)
            </AlertDescription>
          </Alert>
        ) : (
          <RadioGroup
            value={signatureType}
            onValueChange={setSignatureType}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="typed" id="typed" />
              <Label htmlFor="typed">Trükitud nimi</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="smart_id" id="smart_id" />
              <Label htmlFor="smart_id">Smart-ID</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile_id" id="mobile_id" />
              <Label htmlFor="mobile_id">Mobiil-ID</Label>
            </div>
          </RadioGroup>
        )}

        {/* Typed Signature */}
        {signatureType === 'typed' && (
          <div>
            <Label htmlFor="signature">Teie nimi (allkirjana)</Label>
            <Input
              id="signature"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Jaan Tamm"
              className="font-signature text-xl"
            />
          </div>
        )}

        {/* Smart-ID / Mobiil-ID */}
        {(signatureType === 'smart_id' || signatureType === 'mobile_id') && (
          <SmartIdSignature
            type={signatureType}
            onComplete={(result) => {
              signContract.mutate({
                bookingId: booking.id,
                signatureType,
                signatureData: result,
              });
            }}
          />
        )}

        {/* Agreement Checkbox */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={setAgreed}
          />
          <Label htmlFor="agree" className="text-sm leading-tight">
            Olen läbi lugenud ja nõustun{' '}
            <Link href="/terms" className="underline">renditingimustega</Link>
            {' '}ja{' '}
            <Link href="/privacy" className="underline">privaatsuspoliitikaga</Link>
          </Label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Tagasi
        </Button>
        <Button
          disabled={
            !agreed ||
            (signatureType === 'typed' && !typedName) ||
            signContract.isPending
          }
          onClick={() => {
            if (signatureType === 'typed') {
              signContract.mutate({
                bookingId: booking.id,
                signatureType: 'typed',
                signatureData: { name: typedName },
              });
            }
          }}
        >
          Allkirjasta ja jätka maksma
        </Button>
      </CardFooter>
    </Card>
  );
}
```

#### `PaymentStep`

```tsx
// components/booking/PaymentStep.tsx
"use client";

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export function PaymentStep({ booking, onComplete }: PaymentStepProps) {
  const { data: session } = useCheckoutSession(booking.id);

  if (!session) {
    return <PaymentSkeleton />;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: session.clientSecret }}>
      <PaymentForm booking={booking} onComplete={onComplete} />
    </Elements>
  );
}

function PaymentForm({ booking, onComplete }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmed/${booking.id}`,
      },
    });

    if (submitError) {
      setError(submitError.message ?? 'Makse ebaõnnestus');
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Makse</CardTitle>
        <CardDescription>
          Tasuge {formatCurrency(booking.total)} rentimise eest
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <OrderSummary booking={booking} />

          {/* Payment Element */}
          <PaymentElement />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={!stripe || processing}
          >
            {processing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Maksa {formatCurrency(booking.total)}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

---

### Dashboard Components ("Minu rendid")

#### `DashboardOverview`

```tsx
// components/dashboard/DashboardOverview.tsx
export async function DashboardOverview() {
  const bookings = await getMyBookings();
  
  const activeBookings = bookings.filter(b => b.status === 'active');
  const upcomingBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="space-y-8">
      {/* Active Rentals */}
      {activeBookings.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Aktiivsed rendid</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeBookings.map((booking) => (
              <ActiveRentalCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Rentals */}
      {upcomingBookings.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Tulevased rendid</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingBookings.map((booking) => (
              <UpcomingRentalCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Kiirtegevused</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            icon={<Package className="h-6 w-6" />}
            title="Rendi uuesti"
            description="Vaata varasemaid rentimisi"
            href="/dashboard/bookings?tab=past"
          />
          <QuickActionCard
            icon={<FileText className="h-6 w-6" />}
            title="Arved"
            description="Vaata ja laadi alla arveid"
            href="/dashboard/invoices"
          />
          <QuickActionCard
            icon={<Settings className="h-6 w-6" />}
            title="Seaded"
            description="Halda oma profiili"
            href="/dashboard/settings"
          />
        </div>
      </section>
    </div>
  );
}
```

#### `ActiveRentalCard`

```tsx
// components/dashboard/ActiveRentalCard.tsx
"use client";

export function ActiveRentalCard({ booking }: { booking: Booking }) {
  const timeRemaining = useTimeRemaining(booking.end_at);
  const isOverdue = timeRemaining.isOverdue;

  return (
    <Card className={cn(isOverdue && "border-destructive")}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="relative h-20 w-20 rounded-md overflow-hidden">
            <Image
              src={booking.product.image}
              alt={booking.product.name}
              fill
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="font-semibold">{booking.product.name}</h3>
            <p className="text-sm text-muted-foreground">
              {booking.location.name}
            </p>

            {/* Countdown Timer */}
            <div className={cn(
              "mt-2 text-sm font-medium",
              isOverdue ? "text-destructive" : "text-primary"
            )}>
              {isOverdue ? (
                <>Üle aja: {timeRemaining.formatted}</>
              ) : (
                <>Aega jäänud: {timeRemaining.formatted}</>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/bookings/${booking.id}`}>
                Vaata
              </Link>
            </Button>
            <Button size="sm" variant="default" asChild>
              <Link href={`/dashboard/bookings/${booking.id}/return`}>
                Tagasta
              </Link>
            </Button>
          </div>
        </div>

        {/* Access Info */}
        <div className="mt-4 p-3 bg-muted rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Kapi PIN: {booking.access.pin}</p>
              <p className="text-xs text-muted-foreground">
                Kapp {booking.compartment.locker_code}, ukseavaus {booking.compartment.code}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openLocker(booking.compartment.id)}
            >
              Ava kapp
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Admin Components

#### `AdminDashboard`

```tsx
// components/admin/AdminDashboard.tsx
export async function AdminDashboard() {
  const stats = await getAdminStats();
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Aktiivsed rendid"
          value={stats.active_rentals}
          icon={<Package />}
        />
        <StatCard
          title="Tänased korjamised"
          value={stats.pickups_today}
          icon={<ArrowUp />}
        />
        <StatCard
          title="Tänased tagastused"
          value={stats.returns_today}
          icon={<ArrowDown />}
        />
        <StatCard
          title="Üle aja"
          value={stats.overdue}
          icon={<AlertTriangle />}
          variant={stats.overdue > 0 ? "destructive" : "default"}
        />
      </div>

      {/* Alerts */}
      {stats.alerts.length > 0 && (
        <AlertsList alerts={stats.alerts} />
      )}

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentBookings />
        <LockerStatus />
      </div>
    </div>
  );
}
```

#### `BookingsTable`

```tsx
// components/admin/BookingsTable.tsx
"use client";

export function BookingsTable() {
  const [filters, setFilters] = useState<BookingFilters>({});
  
  const { data, isLoading } = useBookings(filters);

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "booking_number",
      header: "Number",
      cell: ({ row }) => (
        <Link
          href={`/admin/bookings/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.booking_number}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Staatus",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "product.name",
      header: "Toode",
    },
    {
      accessorKey: "user",
      header: "Klient",
      cell: ({ row }) => (
        <div>
          <p>{row.original.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.user.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "time_window",
      header: "Ajavahemik",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{formatDateTime(row.original.start_at)}</p>
          <p className="text-muted-foreground">
            → {formatDateTime(row.original.end_at)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Summa",
      cell: ({ row }) => formatCurrency(row.original.total_amount),
    },
    {
      id: "actions",
      cell: ({ row }) => <BookingActions booking={row.original} />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <BookingFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.bookings ?? []}
        loading={isLoading}
      />

      {/* Pagination */}
      <Pagination
        page={data?.pagination.page ?? 1}
        totalPages={data?.pagination.total_pages ?? 1}
        onPageChange={(page) => setFilters({ ...filters, page })}
      />
    </div>
  );
}
```

#### `LockerTimeline`

```tsx
// components/admin/LockerTimeline.tsx
"use client";

export function LockerTimeline({ locationId }: { locationId: string }) {
  const [date, setDate] = useState(new Date());
  const { data: lockers } = useLockerSchedule(locationId, date);

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDate(subDays(date, 1))}
        >
          <ChevronLeft />
        </Button>
        <DatePicker value={date} onChange={setDate} />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDate(addDays(date, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time Header */}
          <TimelineHeader />

          {/* Locker Rows */}
          {lockers?.map((locker) => (
            <div key={locker.id} className="border-b">
              <div className="flex">
                {/* Locker Info */}
                <div className="w-24 p-2 border-r bg-muted">
                  <p className="font-medium">{locker.code}</p>
                  <StatusIndicator status={locker.status} />
                </div>

                {/* Compartments */}
                <div className="flex-1">
                  {locker.compartments.map((comp) => (
                    <CompartmentTimeline
                      key={comp.id}
                      compartment={comp}
                      date={date}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Shared Components

#### `StatusBadge`

```tsx
// components/shared/StatusBadge.tsx
const STATUS_CONFIG: Record<BookingStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  pending: { label: 'Ootel', variant: 'secondary' },
  confirmed: { label: 'Kinnitatud', variant: 'default' },
  active: { label: 'Aktiivne', variant: 'default' },
  completed: { label: 'Lõpetatud', variant: 'outline' },
  overdue: { label: 'Üle aja', variant: 'destructive' },
  cancelled: { label: 'Tühistatud', variant: 'outline' },
  expired: { label: 'Aegunud', variant: 'outline' },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status];
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
```

#### `CountdownTimer`

```tsx
// components/shared/CountdownTimer.tsx
"use client";

export function CountdownTimer({ endAt }: { endAt: string }) {
  const { days, hours, minutes, seconds, isOverdue } = useCountdown(endAt);

  if (isOverdue) {
    return (
      <div className="text-destructive font-mono">
        -{formatDuration({ days, hours, minutes, seconds })}
      </div>
    );
  }

  return (
    <div className="font-mono">
      {days > 0 && <span>{days}p </span>}
      <span>{hours.toString().padStart(2, '0')}:</span>
      <span>{minutes.toString().padStart(2, '0')}:</span>
      <span>{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
}
```

#### `ErrorDisplay`

```tsx
// components/shared/ErrorDisplay.tsx
interface ErrorDisplayProps {
  error: ApiError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {ERROR_TITLES[error.code] ?? 'Midagi läks valesti'}
      </AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {error.suggested_action && (
          <p className="mt-2 font-medium">{error.suggested_action}</p>
        )}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onRetry}
          >
            Proovi uuesti
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

---

## Hooks

### `useCountdown`

```tsx
// hooks/useCountdown.ts
export function useCountdown(endAt: string) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(endAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [endAt]);

  return timeLeft;
}

function calculateTimeLeft(endAt: string) {
  const end = new Date(endAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);

  return {
    days: Math.floor(absDiff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((absDiff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((absDiff / (1000 * 60)) % 60),
    seconds: Math.floor((absDiff / 1000) % 60),
    isOverdue,
    formatted: formatCountdown(absDiff, isOverdue),
  };
}
```

### `useAvailability`

```tsx
// hooks/useAvailability.ts
export function useAvailability({
  productId,
  locationId,
  date,
}: {
  productId: string;
  locationId: string;
  date: Date;
}) {
  return useQuery({
    queryKey: ['availability', productId, locationId, date.toISOString()],
    queryFn: () => api.getAvailability({
      productId,
      locationId,
      date: date.toISOString(),
    }),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  });
}
```

---

## Form Validation

```tsx
// lib/validations/booking.ts
import { z } from 'zod';

export const bookingSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: 'Lõpuaeg peab olema pärast algusaega', path: ['endAt'] }
);

export const signatureSchema = z.object({
  bookingId: z.string().uuid(),
  signatureType: z.enum(['typed', 'smart_id', 'mobile_id', 'id_card']),
  signatureData: z.object({
    name: z.string().min(2).optional(),
    certificateData: z.string().optional(),
  }),
  agreed: z.literal(true, {
    errorMap: () => ({ message: 'Peate nõustuma tingimustega' }),
  }),
});
```

---

## Accessibility

- All interactive elements have visible focus states
- Form errors are announced to screen readers
- Color is never the only indicator of state
- All images have alt text
- Keyboard navigation throughout
- ARIA labels on complex components
- Skip links for main content
- Reduced motion support

---

## Performance

- Server Components for all static content
- Client Components only for interactivity
- Image optimization with `next/image`
- Font optimization with `next/font`
- Route-based code splitting
- Prefetching for likely navigation
- Skeleton loading states
- Optimistic updates where appropriate
