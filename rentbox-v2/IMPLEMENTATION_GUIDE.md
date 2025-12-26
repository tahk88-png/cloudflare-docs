# Rentbox v2 Implementation Guide

This document provides detailed implementation guidance for completing Rentbox v2.

## Current Status

### ✅ Completed Modules

1. **Architecture & Database Schema**
   - Complete PostgreSQL schema with Prisma
   - Database constraints for preventing double bookings
   - Migration files with triggers

2. **Booking Engine**
   - Time-based booking creation
   - Conflict prevention (Redis locks + DB constraints)
   - Availability checking
   - Extension logic
   - Status lifecycle management

3. **Calendar System**
   - Availability slot generation
   - Next available slot finder
   - Maintenance block support

4. **Locker Access Service**
   - MQTT integration for hardware control
   - Access event logging
   - Incident creation on failures

5. **Backend Infrastructure**
   - NestJS module structure
   - Authentication (JWT)
   - Redis service
   - Prisma service
   - API documentation (Swagger)

6. **Frontend Foundation**
   - Next.js 15 setup
   - Tailwind CSS configuration
   - TanStack Query setup
   - Basic dashboard page
   - Booking card component

---

## 🚧 Modules to Complete

### 1. Products & Catalog System

**Backend (`src/products/`):**

```typescript
// products.service.ts
- findAll(filters, pagination)
- findOne(slug)
- findByCategory(categoryId)
- create(dto) - admin only
- update(id, dto) - admin only
- delete(id) - admin only

// products.controller.ts
- GET /products (with filters: category, location, search)
- GET /products/:slug
- POST /products (admin)
- PATCH /products/:id (admin)
- DELETE /products/:id (admin)
```

**Frontend:**
- Product listing page (`/tools`)
- Product detail page (`/tools/[slug]`)
- Product search & filters
- SEO metadata (Schema.org Product)

**Database:**
- Already defined in Prisma schema
- Add full-text search index on product name/description

---

### 2. Checkout & Signing Flow

**Backend (`src/contracts/`):**

```typescript
// contracts.service.ts
- getLatestTerms()
- createContract(bookingId, signatureData)
- verifySignature(contractId)
- requireStrongAuth(booking) - checks if Smart-ID/Mobiil-ID needed

// contracts.controller.ts
- GET /contracts/terms/latest
- POST /contracts (create signature)
- GET /contracts/:id
```

**Signature Logic:**
```typescript
// Check if strong auth required
function requiresStrongAuth(booking: Booking): boolean {
  return (
    booking.totalPrice > 500 || // High amount
    getDurationHours(booking) > 168 || // > 7 days
    booking.user.role === 'b2b' // B2B account
  );
}
```

**Frontend:**
- Checkout page (`/checkout/[bookingId]`)
- Terms display component
- Signature input (typed/Smart-ID/Mobiil-ID)
- Payment integration (Stripe)

---

### 3. Return Flow

**Backend (`src/returns/`):**

```typescript
// returns.service.ts
- initiateReturn(bookingId, userId)
- uploadReturnPhoto(returnId, file)
- confirmReturn(returnId, adminId)
- disputeReturn(returnId, reason)
- resolveDispute(returnId, resolution)

// returns.controller.ts
- POST /returns (initiate)
- POST /returns/:id/photos
- POST /returns/:id/confirm (admin)
- POST /returns/:id/dispute
- POST /returns/:id/resolve (admin)
```

**Frontend:**
- Return confirmation page
- Photo upload component
- Return status display

---

### 4. Notification Engine

**Backend (`src/notifications/`):**

```typescript
// notifications.service.ts
- sendEmail(userId, type, data)
- sendSMS(userId, type, data)
- scheduleNotification(bookingId, type, scheduledAt)
- retryFailedNotifications()

// Use BullMQ for queue processing
- Email queue
- SMS queue
```

**Notification Types:**
- `booking_confirmed`
- `rental_start_reminder` (1h before)
- `return_reminder` (2h before end)
- `overdue_warning` (immediate + hourly)
- `return_confirmed`

**Cron Jobs:**
```typescript
// src/cron/notifications.processor.ts
@Processor('notifications')
export class NotificationsProcessor {
  @Process('send-reminder')
  async handleReminder(job: Job) {
    // Send reminder
  }
}
```

---

### 5. Overdue Detection & Fees

**Cron Job:**

```typescript
// src/cron/overdue.processor.ts
@Cron('*/5 * * * *') // Every 5 minutes
async checkOverdueBookings() {
  const overdue = await this.prisma.booking.findMany({
    where: {
      status: 'active',
      endAt: { lt: new Date() },
    },
  });

  for (const booking of overdue) {
    // Update status
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'overdue' },
    });

    // Calculate fee
    const hoursOverdue = getHoursOverdue(booking.endAt);
    const hourlyRate = getHourlyRate(booking.productId);
    const fee = hoursOverdue * hourlyRate;

    // Create fee record
    await this.prisma.bookingOverdueFee.create({
      data: {
        bookingId: booking.id,
        amount: fee,
      },
    });

    // Send notification
    await this.notifications.sendSMS(booking.userId, 'overdue_warning', {
      bookingId: booking.id,
      fee,
    });
  }
}
```

---

### 6. User Dashboard ("Minu Rendid")

**Frontend (`src/app/dashboard/`):**

- Active rentals section
- Upcoming rentals section
- Past rentals section
- Countdown timers (real-time)
- Quick actions:
  - "Open Compartment" button (for active bookings)
  - "Extend Rental" button
  - "Return Now" button
  - "Rent Again" button

**Components:**
- `BookingCard` (already created)
- `CountdownTimer` (new)
- `QuickActions` (new)

---

### 7. Content Creation Engine

**Backend (`src/content/`):**

```typescript
// content.service.ts
- createPage(dto)
- updatePage(id, dto)
- publishPage(id)
- getPage(slug)
- getPageVersions(id)
- restoreVersion(pageId, versionId)

// AI text improvement (optional)
- improveText(text, options) - calls external AI API
```

**Block Types:**
```typescript
interface ContentBlock {
  type: 'text' | 'image' | 'video' | 'cta';
  order: number;
  data: {
    // text
    content?: string;
    
    // image
    url?: string;
    alt?: string;
    
    // video
    videoUrl?: string;
    thumbnail?: string;
    
    // cta
    text?: string;
    link?: string;
    style?: string;
  };
}
```

**Frontend:**
- Block editor component
- Drag-and-drop reordering
- AI improvement button (suggests, doesn't overwrite)
- Preview modes (web/email/mobile)

---

### 8. RBAC System

**Backend:**

```typescript
// src/auth/decorators/roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// src/auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.role === role);
  }
}
```

**Usage:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'operator')
@Post('products')
async createProduct() { ... }
```

**Frontend:**
- Hide UI elements based on role
- Route protection middleware

---

### 9. Incident Management

**Backend (`src/incidents/`):**

```typescript
// incidents.service.ts
- create(type, severity, data)
- findAll(filters)
- updateStatus(id, status, resolutionNotes)
- assignTo(id, userId)
```

**Frontend:**
- Admin incident dashboard
- Incident detail page
- Status updates
- Resolution notes

---

### 10. SEO & Conversion Layer

**Frontend:**

```typescript
// src/app/tools/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription,
    openGraph: { ... },
  };
}

// Schema.org JSON-LD
export function ProductSchema({ product }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          offers: {
            '@type': 'Offer',
            price: product.pricing[0].price,
            priceCurrency: 'EUR',
          },
        }),
      }}
    />
  );
}
```

**Pages:**
- `/tools/[slug]` - Product page
- `/tools/[slug]/[location]` - Location-specific page
- `/tools/[slug]/rent-vs-buy` - Calculator page

---

## Database Migrations Needed

1. **Add full-text search:**
```sql
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

2. **Add booking status index:**
```sql
CREATE INDEX idx_bookings_status_dates ON bookings(status, start_at, end_at);
```

---

## Environment Variables

**Backend (.env):**
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
TWILIO_ACCOUNT_SID=...
RESEND_API_KEY=...
MQTT_BROKER_URL=mqtt://...
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

---

## Testing Strategy

1. **Unit Tests:**
   - Booking conflict prevention logic
   - Pricing calculations
   - Availability checking

2. **Integration Tests:**
   - Booking creation flow
   - Payment processing
   - Locker access

3. **E2E Tests:**
   - Complete rental flow
   - Return flow
   - Admin operations

---

## Deployment Checklist

- [ ] PostgreSQL database provisioned
- [ ] Redis instance provisioned
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] MQTT broker accessible
- [ ] Payment provider configured
- [ ] SMS/Email providers configured
- [ ] Monitoring & alerting setup
- [ ] Backup strategy configured
- [ ] Cron jobs scheduled (overdue detection, cleanup)

---

## Critical Path Items

1. **Products & Catalog** - Required for bookings
2. **Checkout & Signing** - Required for payment
3. **Return Flow** - Required for completion
4. **Notification Engine** - Required for user communication
5. **Overdue Detection** - Required for system integrity

---

## Next Steps

1. Implement Products module (backend + frontend)
2. Implement Checkout flow with Stripe integration
3. Implement Return flow
4. Set up notification queues (BullMQ)
5. Add cron jobs for overdue detection
6. Complete user dashboard with real-time updates
7. Add admin panels for management
8. Implement SEO layer
9. Add comprehensive error handling
10. Set up monitoring & logging

---

**End of Implementation Guide**
