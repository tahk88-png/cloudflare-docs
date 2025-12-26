# Frontend Component Architecture

Complete component hierarchy and structure for Rentbox v2 using Next.js 14, React, Tailwind CSS, and shadcn/ui.

## Technology Stack

### Core
- **Next.js 14+**: App Router, Server Components, Server Actions
- **React 18+**: Hooks, Context, Suspense
- **TypeScript 5+**: Strict mode

### Styling
- **Tailwind CSS 3.x**: Utility-first styling
- **shadcn/ui**: Component library (Radix UI primitives)
- **CVA**: Class Variance Authority for component variants

### State Management
- **React Query (TanStack Query)**: Server state, caching
- **Zustand**: Client state (UI, cart, filters)
- **React Hook Form**: Form state
- **Zod**: Schema validation

### Real-time
- **Socket.io Client**: WebSocket for live updates
- **Pusher** (alternative): Real-time events

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes group
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (customer)/               # Customer routes group
│   │   ├── dashboard/
│   │   ├── bookings/
│   │   └── layout.tsx
│   ├── (admin)/                  # Admin routes group
│   │   ├── admin/
│   │   └── layout.tsx
│   ├── products/
│   ├── locations/
│   └── layout.tsx
│
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components (shadcn)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── calendar.tsx
│   │   └── ...
│   ├── booking/                  # Booking-specific components
│   ├── calendar/                 # Calendar components
│   ├── dashboard/                # Dashboard components
│   ├── locker/                   # Locker visualization
│   └── layout/                   # Layout components
│
├── lib/                          # Utilities and configurations
│   ├── api/                      # API client
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # Zustand stores
│   ├── utils/                    # Helper functions
│   └── validations/              # Zod schemas
│
└── types/                        # TypeScript types
    ├── api.ts
    ├── booking.ts
    └── ...
```

---

## Core Component Categories

### 1. Layout Components

#### AppShell
**Purpose**: Main application wrapper with navigation

```tsx
// components/layout/AppShell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
```

**Features**:
- Responsive header with navigation
- Mobile menu drawer
- User profile dropdown
- Notification bell
- Search bar

---

#### Header
**Purpose**: Top navigation bar

```tsx
// components/layout/Header.tsx
export function Header() {
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Logo />
        <Navigation />
        <div className="flex items-center gap-4">
          <SearchBar />
          <NotificationBell count={notifications?.unread} />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
```

---

### 2. Booking Components

#### BookingFlow
**Purpose**: Multi-step booking wizard

```tsx
// components/booking/BookingFlow.tsx
export function BookingFlow() {
  const [step, setStep] = useState(1);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>(null);
  
  return (
    <div className="max-w-4xl mx-auto">
      <BookingSteps currentStep={step} />
      
      {step === 1 && (
        <ProductSelection 
          onSelect={(product) => {
            setBookingDraft({ ...bookingDraft, product });
            setStep(2);
          }}
        />
      )}
      
      {step === 2 && (
        <LocationSelection 
          productId={bookingDraft.product.id}
          onSelect={(location) => {
            setBookingDraft({ ...bookingDraft, location });
            setStep(3);
          }}
        />
      )}
      
      {step === 3 && (
        <TimeSelection 
          productId={bookingDraft.product.id}
          locationId={bookingDraft.location.id}
          onSelect={(timeSlot) => {
            setBookingDraft({ ...bookingDraft, timeSlot });
            setStep(4);
          }}
        />
      )}
      
      {step === 4 && (
        <BookingSummary 
          draft={bookingDraft}
          onConfirm={handleBookingCreate}
        />
      )}
    </div>
  );
}
```

**Sub-components**:
- `BookingSteps`: Progress indicator
- `ProductSelection`: Product grid/list
- `LocationSelection`: Location picker with map
- `TimeSelection`: Calendar + time slot picker
- `BookingSummary`: Review before checkout

---

#### AvailabilityCalendar
**Purpose**: Show available time slots for booking

```tsx
// components/booking/AvailabilityCalendar.tsx
interface AvailabilityCalendarProps {
  productId: string;
  locationId: string;
  onSelect: (start: Date, end: Date) => void;
}

export function AvailabilityCalendar({
  productId,
  locationId,
  onSelect
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState(4); // hours
  
  const { data: availability, isLoading } = useAvailability({
    productId,
    locationId,
    date: selectedDate
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Date & Time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date picker */}
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => date < new Date()}
        />
        
        {/* Duration selector */}
        <DurationSelector 
          value={duration}
          onChange={setDuration}
          options={[1, 2, 4, 8, 24, 48]}
        />
        
        {/* Time slot grid */}
        {isLoading ? (
          <TimeSlotSkeleton />
        ) : (
          <TimeSlotGrid
            slots={availability.slots}
            duration={duration}
            onSelect={(slot) => {
              const start = slot.time;
              const end = addHours(start, duration);
              onSelect(start, end);
            }}
          />
        )}
        
        {/* Next available */}
        {availability?.nextAvailable && (
          <Alert>
            <InfoIcon />
            <AlertDescription>
              Next available: {format(availability.nextAvailable, 'PPp')}
              <Button 
                variant="link" 
                onClick={() => setSelectedDate(availability.nextAvailable)}
              >
                Jump to date
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

---

#### TimeSlotGrid
**Purpose**: Display clickable time slots

```tsx
// components/booking/TimeSlotGrid.tsx
interface TimeSlot {
  time: Date;
  available: boolean;
  price: number;
}

export function TimeSlotGrid({
  slots,
  duration,
  onSelect
}: {
  slots: TimeSlot[];
  duration: number;
  onSelect: (slot: TimeSlot) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot) => (
        <Button
          key={slot.time.toISOString()}
          variant={slot.available ? 'outline' : 'ghost'}
          disabled={!slot.available}
          onClick={() => onSelect(slot)}
          className={cn(
            'h-auto flex flex-col items-start p-3',
            slot.available && 'hover:bg-green-50 hover:border-green-500'
          )}
        >
          <span className="font-semibold">
            {format(slot.time, 'HH:mm')}
          </span>
          <span className="text-xs text-muted-foreground">
            €{(slot.price / 100).toFixed(2)}
          </span>
        </Button>
      ))}
    </div>
  );
}
```

---

#### BookingCard
**Purpose**: Display booking summary card

```tsx
// components/booking/BookingCard.tsx
export function BookingCard({ booking }: { booking: Booking }) {
  const timeRemaining = useCountdown(booking.end_at);
  const canExtend = booking.status === 'active';
  const canReturn = booking.status === 'active' || booking.status === 'overdue';
  
  return (
    <Card className={cn(
      booking.status === 'overdue' && 'border-red-500',
      booking.status === 'active' && 'border-green-500'
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{booking.product.name}</CardTitle>
            <CardDescription>
              {booking.location.name} • {booking.compartment.number}
            </CardDescription>
          </div>
          <StatusBadge status={booking.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ProductImage src={booking.product.images[0]} />
        
        <div className="space-y-2">
          <TimeInfo
            label="Pick-up"
            time={booking.start_at}
            actual={booking.actual_start_at}
          />
          <TimeInfo
            label="Return"
            time={booking.end_at}
            actual={booking.actual_end_at}
          />
        </div>
        
        {booking.status === 'active' && (
          <CountdownTimer
            endTime={booking.end_at}
            onExpired={() => refetch()}
          />
        )}
        
        {booking.status === 'overdue' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Overdue</AlertTitle>
            <AlertDescription>
              Overdue fees: €{(booking.overdue_fees / 100).toFixed(2)}
              <br />
              Please return immediately.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        {booking.status === 'paid' && (
          <Button onClick={() => showAccessCode(booking)} className="w-full">
            Show Access Code
          </Button>
        )}
        
        {canExtend && (
          <Button variant="outline" onClick={() => openExtendDialog(booking)}>
            Extend Rental
          </Button>
        )}
        
        {canReturn && (
          <Button 
            variant="default" 
            onClick={() => openReturnFlow(booking)}
            className="w-full"
          >
            Return Tool
          </Button>
        )}
        
        <Button variant="ghost" asChild>
          <Link href={`/bookings/${booking.id}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

### 3. Calendar Components

#### AdminCalendar
**Purpose**: Admin timeline view of all bookings

```tsx
// components/calendar/AdminCalendar.tsx
export function AdminCalendar() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const { data: bookings } = useAdminBookings({
    date,
    locationId: selectedLocation
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(subDays(date, view === 'day' ? 1 : 7))}
          >
            <ChevronLeft />
          </Button>
          
          <h2 className="text-2xl font-bold">
            {format(date, view === 'day' ? 'PPP' : 'PPP')}
          </h2>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(addDays(date, view === 'day' ? 1 : 7))}
          >
            <ChevronRight />
          </Button>
          
          <Button variant="outline" onClick={() => setDate(new Date())}>
            Today
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <LocationFilter value={selectedLocation} onChange={setSelectedLocation} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>
      
      <TimelineView
        bookings={bookings}
        date={date}
        view={view}
        onBookingClick={(booking) => openBookingDetails(booking)}
      />
    </div>
  );
}
```

---

#### TimelineView
**Purpose**: Visual timeline of locker compartments and bookings

```tsx
// components/calendar/TimelineView.tsx
export function TimelineView({
  bookings,
  date,
  view
}: TimelineViewProps) {
  const hours = view === 'day' ? 24 : 24 * 7;
  const groupedByLocker = groupBy(bookings, 'locker_id');
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Time header */}
          <TimeHeader hours={hours} startDate={date} />
          
          {/* Locker rows */}
          {Object.entries(groupedByLocker).map(([lockerId, lockerBookings]) => (
            <LockerRow
              key={lockerId}
              lockerId={lockerId}
              bookings={lockerBookings}
              startDate={date}
              hours={hours}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 4. Dashboard Components

#### CustomerDashboard
**Purpose**: Customer's main dashboard ("Minu Rendid")

```tsx
// components/dashboard/CustomerDashboard.tsx
export function CustomerDashboard() {
  const { data: bookings } = useUserBookings();
  const { data: user } = useAuth();
  
  const activeBookings = bookings?.filter(b => b.status === 'active') ?? [];
  const upcomingBookings = bookings?.filter(b => b.status === 'paid') ?? [];
  const pastBookings = bookings?.filter(b => b.status === 'completed') ?? [];
  
  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.first_name}!</h1>
        <p className="text-muted-foreground">Manage your tool rentals</p>
      </div>
      
      {/* Active rentals */}
      {activeBookings.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Active Rentals</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}
      
      {/* Upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Upcoming Bookings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}
      
      {/* Quick actions */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            icon={<SearchIcon />}
            title="Browse Tools"
            description="Find the perfect tool for your project"
            href="/products"
          />
          <QuickActionCard
            icon={<MapPinIcon />}
            title="Find Locations"
            description="Locate the nearest locker"
            href="/locations"
          />
          <QuickActionCard
            icon={<HistoryIcon />}
            title="Rental History"
            description="View past rentals"
            href="/bookings/history"
          />
        </div>
      </section>
      
      {/* Past rentals */}
      {pastBookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Past Rentals</h2>
            <Button variant="link" asChild>
              <Link href="/bookings/history">View All</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {pastBookings.slice(0, 5).map(booking => (
              <BookingListItem key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

---

#### AdminDashboard
**Purpose**: Admin overview and metrics

```tsx
// components/dashboard/AdminDashboard.tsx
export function AdminDashboard() {
  const { data: stats } = useAdminStats();
  const { data: incidents } = useOpenIncidents();
  const { data: overdueBookings } = useOverdueBookings();
  
  return (
    <div className="space-y-8">
      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Active Bookings"
          value={stats?.bookings.active}
          change="+12% from yesterday"
          icon={<CalendarIcon />}
        />
        <StatCard
          title="Revenue Today"
          value={`€${(stats?.revenue_today / 100).toFixed(2)}`}
          change="+8% from average"
          icon={<EuroIcon />}
        />
        <StatCard
          title="Locker Status"
          value={`${stats?.lockers.online}/${stats?.lockers.total}`}
          subtitle="online"
          icon={<ServerIcon />}
          variant={stats?.lockers.offline > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Open Incidents"
          value={stats?.incidents.open}
          subtitle={`${stats?.incidents.p0} critical`}
          icon={<AlertTriangleIcon />}
          variant={stats?.incidents.p0 > 0 ? 'destructive' : 'default'}
        />
      </div>
      
      {/* Alerts */}
      {overdueBookings.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Overdue Bookings</AlertTitle>
          <AlertDescription>
            {overdueBookings.length} rentals are overdue. 
            <Button variant="link" asChild>
              <Link href="/admin/bookings?status=overdue">View All</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Recent activity */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <ActivityFeed />
      </section>
      
      {/* Open incidents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Open Incidents</h2>
          <Button asChild>
            <Link href="/admin/incidents">View All</Link>
          </Button>
        </div>
        <IncidentList incidents={incidents} />
      </section>
    </div>
  );
}
```

---

### 5. Return Flow Components

#### ReturnDialog
**Purpose**: Multi-step return process

```tsx
// components/booking/ReturnDialog.tsx
export function ReturnDialog({
  booking,
  open,
  onOpenChange
}: ReturnDialogProps) {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  
  const returnMutation = useReturnBooking();
  
  const handleSubmit = async () => {
    // Upload photos first
    const photoUrls = await uploadPhotos(photos);
    
    // Submit return
    await returnMutation.mutateAsync({
      bookingId: booking.id,
      conditionNotes: notes,
      photos: photoUrls
    });
    
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Return Tool</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Take photos of the tool condition'}
            {step === 2 && 'Add any notes about the tool'}
            {step === 3 && 'Place tool in compartment'}
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
          <PhotoUpload
            photos={photos}
            onChange={setPhotos}
            maxPhotos={5}
            onNext={() => setStep(2)}
          />
        )}
        
        {step === 2 && (
          <NotesInput
            value={notes}
            onChange={setNotes}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        
        {step === 3 && (
          <ReturnInstructions
            booking={booking}
            onConfirm={handleSubmit}
            onBack={() => setStep(2)}
            isLoading={returnMutation.isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

### 6. Locker Visualization Components

#### LockerMap
**Purpose**: Interactive map of locker locations

```tsx
// components/locker/LockerMap.tsx
export function LockerMap({
  locations,
  selectedId,
  onSelect
}: LockerMapProps) {
  return (
    <div className="relative h-[600px] rounded-lg overflow-hidden">
      <MapContainer
        center={[59.437, 24.754]} // Tallinn
        zoom={12}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map(location => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            eventHandlers={{
              click: () => onSelect(location)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{location.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {location.address_line1}
                </p>
                <Button size="sm" className="mt-2" asChild>
                  <Link href={`/locations/${location.slug}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Location list sidebar */}
      <div className="absolute top-4 left-4 w-80 bg-white rounded-lg shadow-lg p-4 max-h-[500px] overflow-auto">
        <h3 className="font-semibold mb-2">Locations</h3>
        <div className="space-y-2">
          {locations.map(location => (
            <LocationListItem
              key={location.id}
              location={location}
              selected={location.id === selectedId}
              onClick={() => onSelect(location)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

#### CompartmentGrid
**Purpose**: Visual representation of locker compartments

```tsx
// components/locker/CompartmentGrid.tsx
export function CompartmentGrid({
  compartments,
  onClick
}: CompartmentGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {compartments.map(compartment => (
        <CompartmentCell
          key={compartment.id}
          compartment={compartment}
          onClick={() => onClick(compartment)}
        />
      ))}
    </div>
  );
}

function CompartmentCell({
  compartment,
  onClick
}: {
  compartment: Compartment;
  onClick: () => void;
}) {
  const statusColors = {
    available: 'bg-green-100 border-green-500 hover:bg-green-200',
    occupied: 'bg-gray-100 border-gray-400',
    maintenance: 'bg-yellow-100 border-yellow-500',
    damaged: 'bg-red-100 border-red-500'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={compartment.status !== 'available'}
      className={cn(
        'aspect-square border-2 rounded-lg p-4 transition-colors',
        'flex flex-col items-center justify-center',
        statusColors[compartment.status]
      )}
    >
      <span className="font-mono font-bold text-lg">
        {compartment.number}
      </span>
      <span className="text-xs capitalize mt-1">
        {compartment.status}
      </span>
    </button>
  );
}
```

---

### 7. Forms & Input Components

#### BookingForm
**Purpose**: Booking creation form with validation

```tsx
// components/booking/BookingForm.tsx
const bookingSchema = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  start_at: z.date(),
  end_at: z.date(),
}).refine(data => data.end_at > data.start_at, {
  message: 'End time must be after start time',
  path: ['end_at']
});

export function BookingForm() {
  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema)
  });
  
  const createBooking = useCreateBooking();
  
  const onSubmit = async (values: z.infer<typeof bookingSchema>) => {
    await createBooking.mutateAsync(values);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <ProductSelect {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="location_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <LocationSelect {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="start_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <DateTimePicker {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="end_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time</FormLabel>
              <DateTimePicker {...field} />
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={createBooking.isLoading}>
          {createBooking.isLoading ? 'Creating...' : 'Create Booking'}
        </Button>
      </form>
    </Form>
  );
}
```

---

### 8. Utility Components

#### CountdownTimer
**Purpose**: Real-time countdown to booking end

```tsx
// components/ui/CountdownTimer.tsx
export function CountdownTimer({
  endTime,
  onExpired
}: {
  endTime: Date;
  onExpired?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<Duration | null>(null);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = differenceInSeconds(endTime, now);
      
      if (diff <= 0) {
        onExpired?.();
        clearInterval(interval);
        return;
      }
      
      setTimeLeft({
        hours: Math.floor(diff / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [endTime, onExpired]);
  
  if (!timeLeft) return null;
  
  const isUrgent = (timeLeft.hours === 0 && timeLeft.minutes < 30);
  
  return (
    <div className={cn(
      'flex items-center gap-2 p-4 rounded-lg',
      isUrgent ? 'bg-red-50 text-red-900' : 'bg-blue-50 text-blue-900'
    )}>
      <Clock className="h-5 w-5" />
      <div>
        <div className="font-mono text-2xl font-bold">
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <div className="text-sm">
          {isUrgent ? 'Return soon!' : 'Time remaining'}
        </div>
      </div>
    </div>
  );
}
```

---

#### StatusBadge
**Purpose**: Visual status indicator

```tsx
// components/ui/StatusBadge.tsx
export function StatusBadge({ status }: { status: BookingStatus }) {
  const variants = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    active: { label: 'Active', color: 'bg-green-100 text-green-800' },
    completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
    expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' }
  };
  
  const variant = variants[status];
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      variant.color
    )}>
      {variant.label}
    </span>
  );
}
```

---

## State Management

### React Query Hooks

```typescript
// lib/hooks/useBookings.ts
export function useUserBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: ['bookings', 'user', filters],
    queryFn: () => api.bookings.list(filters),
    refetchInterval: 30000, // Refetch every 30s for active bookings
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => api.bookings.get(id),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.bookings.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
```

---

### Zustand Stores

```typescript
// lib/store/useBookingStore.ts
interface BookingStore {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft) => void;
  clearDraft: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
```

---

## Real-Time Updates

### WebSocket Integration

```typescript
// lib/hooks/useRealtimeBooking.ts
export function useRealtimeBooking(bookingId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL);
    
    socket.emit('subscribe', { booking: bookingId });
    
    socket.on('booking:updated', (data) => {
      queryClient.setQueryData(['bookings', bookingId], data);
    });
    
    socket.on('booking:overdue', (data) => {
      toast.warning('Your rental is now overdue. Please return immediately.');
      queryClient.setQueryData(['bookings', bookingId], data);
    });
    
    return () => {
      socket.emit('unsubscribe', { booking: bookingId });
      socket.disconnect();
    };
  }, [bookingId, queryClient]);
}
```

---

## Responsive Design Patterns

### Mobile-First Approach

```tsx
// Mobile navigation
<div className="lg:hidden">
  <MobileMenu />
</div>

// Desktop navigation
<div className="hidden lg:block">
  <DesktopNav />
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

---

## Summary

**Frontend architecture ensures:**
1. ✅ Type-safe components with TypeScript
2. ✅ Optimistic UI updates
3. ✅ Real-time data synchronization
4. ✅ Accessible components (WCAG 2.1 AA)
5. ✅ Mobile-responsive design
6. ✅ Performance-optimized (code splitting, lazy loading)

**Key patterns used:**
- Server Components for static content
- Client Components for interactivity
- React Query for server state
- Zustand for UI state
- Optimistic updates for better UX
- Error boundaries for resilience
