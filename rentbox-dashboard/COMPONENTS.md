# Component Documentation

This document describes all React components in the Rentbox.ee Dashboard.

## Component Hierarchy

```
App
└── Dashboard
    ├── DashboardSummary
    ├── RentalCard
    │   └── StatusBadge
    ├── InvoiceCard
    │   └── StatusBadge
    ├── AgreementCard
    ├── LoadingSpinner
    ├── ErrorMessage
    └── EmptyState
```

## Core Components

### Dashboard

**Location:** `src/components/Dashboard.tsx`

Main component that orchestrates the entire dashboard.

**Features:**
- Tab-based navigation (Overview, Bookings, Invoices, Agreements)
- Data fetching from API
- Loading and error states
- Responsive layout

**State:**
- `activeTab`: Current tab ('overview' | 'bookings' | 'invoices' | 'agreements')
- `loading`: Boolean loading state
- `error`: Error message string
- `dashboardData`: Dashboard overview data
- `bookingsData`: All bookings data
- `invoicesData`: Invoices and agreements data

**Methods:**
- `loadDashboardData()`: Fetches all data from API
- `handleRentAgain(rentalId)`: Creates new rental from past rental

### DashboardSummary

**Location:** `src/components/DashboardSummary.tsx`

Displays summary statistics at the top of the dashboard.

**Props:**
```typescript
interface DashboardSummaryProps {
  summary: {
    activeRentalsCount: number;
    upcomingRentalsCount: number;
    pendingInvoicesCount: number;
    totalSpent: number;
    currency: string;
  };
}
```

**Features:**
- Four stat cards in responsive grid
- Icons for visual identification
- Color-coded backgrounds
- Formatted currency display

**Layout:**
- 2 columns on mobile
- 4 columns on desktop

### RentalCard

**Location:** `src/components/RentalCard.tsx`

Displays a single rental with all relevant information.

**Props:**
```typescript
interface RentalCardProps {
  rental: Rental;
  showActions?: boolean;
  onRentAgain?: (rentalId: string) => void;
}
```

**Features:**
- Item image (if available)
- Item name and type
- Status badge
- Start and end dates
- Time remaining (for active rentals)
- Locker location
- Access code (for active rentals)
- Price
- "Rent Again" button (for past rentals)

**Styling:**
- White card with shadow
- Hover effect
- Responsive image
- Color-coded time remaining

**Example Usage:**
```tsx
<RentalCard 
  rental={rentalData}
  showActions={true}
  onRentAgain={handleRentAgain}
/>
```

### InvoiceCard

**Location:** `src/components/InvoiceCard.tsx`

Displays invoice information with payment status.

**Props:**
```typescript
interface InvoiceCardProps {
  invoice: Invoice;
}
```

**Features:**
- Invoice number
- Issue and due dates
- Amount with currency
- Status badge
- Payment date (if paid)
- Download button

**Actions:**
- Click "Download Invoice" to download PDF

**Example Usage:**
```tsx
<InvoiceCard invoice={invoiceData} />
```

### AgreementCard

**Location:** `src/components/AgreementCard.tsx`

Displays signed agreement documents.

**Props:**
```typescript
interface AgreementCardProps {
  agreement: Agreement;
}
```

**Features:**
- Document icon
- Agreement number
- Signed date
- Document type
- View button (opens in new tab)
- Download button

**Actions:**
- "View" - Opens PDF in new tab
- "Download" - Downloads PDF file

**Example Usage:**
```tsx
<AgreementCard agreement={agreementData} />
```

### StatusBadge

**Location:** `src/components/StatusBadge.tsx`

Color-coded status indicator.

**Props:**
```typescript
interface StatusBadgeProps {
  status: RentalStatus | InvoiceStatus;
  variant?: 'rental' | 'invoice';
}
```

**Rental Statuses:**
- `active` - Green badge
- `upcoming` - Blue badge
- `completed` - Gray badge
- `cancelled` - Red badge

**Invoice Statuses:**
- `paid` - Green badge
- `pending` - Yellow badge
- `overdue` - Red badge
- `cancelled` - Gray badge

**Example Usage:**
```tsx
<StatusBadge status="active" variant="rental" />
<StatusBadge status="pending" variant="invoice" />
```

## Utility Components

### LoadingSpinner

**Location:** `src/components/LoadingSpinner.tsx`

Displays a loading animation.

**Features:**
- Centered spinner
- Smooth animation
- Primary color themed

**Usage:**
```tsx
{loading && <LoadingSpinner />}
```

### ErrorMessage

**Location:** `src/components/ErrorMessage.tsx`

Displays error messages in a user-friendly way.

**Props:**
```typescript
interface ErrorMessageProps {
  message: string;
}
```

**Features:**
- Red alert styling
- Error icon
- Clear message text

**Usage:**
```tsx
{error && <ErrorMessage message={error} />}
```

### EmptyState

**Location:** `src/components/EmptyState.tsx`

Displays when no data is available.

**Props:**
```typescript
interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}
```

**Features:**
- Centered layout
- Custom icon support
- Friendly message

**Usage:**
```tsx
{rentals.length === 0 && (
  <EmptyState 
    message="No active rentals" 
    icon={<Package className="w-8 h-8" />}
  />
)}
```

## Services

### API Service

**Location:** `src/services/api.ts`

Handles all API communication.

**Methods:**

```typescript
// Get dashboard overview
getDashboard(): Promise<UserDashboard>

// Get all bookings
getBookings(): Promise<BookingsResponse>

// Get invoices and agreements
getInvoices(): Promise<InvoicesResponse>

// Create new rental from past rental
rentAgain(rentalId: string): Promise<{ bookingId: string }>
```

**Features:**
- Mock data mode for development
- Token-based authentication
- Error handling
- TypeScript types

**Configuration:**
```typescript
// .env
VITE_API_BASE_URL=https://api.rentbox.ee
VITE_MOCK_API=true  // false for production
```

## Utilities

### Date Utils

**Location:** `src/utils/dateUtils.ts`

Date formatting and calculation functions.

**Functions:**

```typescript
// Format date: "Dec 26, 2024"
formatDate(date: string | Date): string

// Format with time: "Dec 26, 2024 14:30"
formatDateTime(date: string | Date): string

// Time remaining: "2 days left", "5 hours left"
formatTimeRemaining(endDate: string | Date): string

// Countdown: "starts in 2 days"
formatCountdown(startDate: string | Date): string

// Get color class for time remaining
getTimeRemainingColor(endDate: string | Date): string
```

### Formatters

**Location:** `src/utils/formatters.ts`

Number and currency formatting.

**Functions:**

```typescript
// Format currency: "€25.00"
formatCurrency(amount: number, currency?: string): string

// Format number: "1,234"
formatNumber(value: number): string
```

## Type Definitions

**Location:** `src/types/index.ts`

All TypeScript interfaces and types.

**Key Types:**

```typescript
// Rental status
type RentalStatus = 'active' | 'upcoming' | 'completed' | 'cancelled';

// Invoice status
type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

// Payment method
type PaymentMethod = 'card' | 'bank_transfer' | 'cash';

// Rental object
interface Rental {
  id: string;
  itemName: string;
  itemType: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  lockerLocation?: string;
  lockerCode?: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

// Invoice object
interface Invoice {
  id: string;
  invoiceNumber: string;
  rentalId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  downloadUrl: string;
}

// Agreement object
interface Agreement {
  id: string;
  rentalId: string;
  agreementNumber: string;
  signedDate: string;
  documentUrl: string;
  documentType: 'rental_agreement' | 'terms_conditions';
}
```

## Styling System

### Tailwind Configuration

**Location:** `tailwind.config.js`

Custom color palette:

```javascript
colors: {
  primary: {
    50: '#f0f9ff',
    500: '#0ea5e9',
    600: '#0284c7',
    // ...
  },
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    // ...
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    // ...
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    // ...
  }
}
```

### Responsive Breakpoints

- `sm`: 640px (tablet)
- `md`: 768px (tablet landscape)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

### Common Patterns

**Card:**
```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
  {/* content */}
</div>
```

**Button Primary:**
```tsx
<button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
  Action
</button>
```

**Button Secondary:**
```tsx
<button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
  Action
</button>
```

**Grid Layout:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* items */}
</div>
```

## Best Practices

### Component Design

1. **Single Responsibility**: Each component has one clear purpose
2. **Props Interface**: Always define TypeScript interfaces for props
3. **Composition**: Break down complex components into smaller ones
4. **Reusability**: Design components to be reusable

### State Management

1. **Local State**: Use `useState` for component-specific state
2. **Side Effects**: Use `useEffect` for data fetching
3. **Callbacks**: Pass functions via props for actions
4. **Immutability**: Never mutate state directly

### Performance

1. **Avoid Inline Functions**: Define callbacks outside render
2. **Key Props**: Always use unique keys in lists
3. **Conditional Rendering**: Use early returns for cleaner code
4. **Lazy Loading**: Consider code splitting for large components

### Accessibility

1. **Semantic HTML**: Use proper HTML elements
2. **ARIA Labels**: Add labels where needed
3. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
4. **Color Contrast**: Follow WCAG guidelines

### Testing Components

```bash
# Type check
npm run check

# Build (includes all checks)
npm run build

# Manual testing
npm run dev
```

## Adding New Components

1. Create component file in `src/components/`
2. Define TypeScript interfaces for props
3. Import and use existing utility components
4. Follow existing styling patterns
5. Export component
6. Import in parent component
7. Test thoroughly

**Example:**

```tsx
// src/components/MyNewComponent.tsx
import { formatDate } from '../utils/dateUtils';

interface MyNewComponentProps {
  data: string;
}

export function MyNewComponent({ data }: MyNewComponentProps) {
  return (
    <div className="bg-white p-4 rounded-lg">
      {data}
    </div>
  );
}
```

Then use it:

```tsx
import { MyNewComponent } from './components/MyNewComponent';

<MyNewComponent data="Hello" />
```
