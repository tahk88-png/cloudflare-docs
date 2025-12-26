# Module 3: Booking Engine

> The core of Rentbox. Time-based reservations with absolute guarantee against double bookings.

## Overview

The booking engine manages the complete lifecycle of tool rentals:
- Time slot selection
- Availability checking
- Booking creation with TTL
- Payment and contract integration
- Status lifecycle management
- Extension handling
- Overdue detection

## Core Principles

1. **Time-based availability** - A tool is available if no booking exists for the requested window
2. **Database is truth** - PostgreSQL exclusion constraint prevents overlaps at the lowest level
3. **Pending TTL** - Unpaid bookings expire after 15 minutes, releasing the slot
4. **Idempotency** - Critical operations can be safely retried
5. **Full audit trail** - Every status change is logged

---

## Data Model

### Booking Entity

```typescript
interface Booking {
  id: string;                    // UUID
  bookingNumber: string;         // Human-readable: RB-2024-000001
  
  // Parties
  userId: string;
  
  // What & Where
  productId: string;
  inventoryId: string;
  locationId: string;
  compartmentId: string;
  
  // Time window
  startAt: Date;                 // timestamptz
  endAt: Date;                   // timestamptz
  pickedUpAt?: Date;
  returnedAt?: Date;
  
  // Status
  status: BookingStatus;
  
  // Pricing
  hourlyRate: number;
  dailyRate: number;
  subtotal: number;
  depositAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: 'EUR';
  
  // Additional charges
  extensionCharges: number;
  overdueCharges: number;
  damageCharges: number;
  
  // Payment tracking
  depositStatus: DepositStatus;
  paymentStatus: PaymentStatus;
  
  // Contract
  contractSignedAt?: Date;
  contractHash?: string;
  signatureType?: SignatureType;
  
  // Metadata
  source: 'web' | 'mobile' | 'admin' | 'api';
  notes?: string;
  adminNotes?: string;
  expiresAt?: Date;              // For pending bookings
  idempotencyKey?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

type BookingStatus = 
  | 'pending'     // Created, awaiting payment
  | 'confirmed'   // Paid, ready for pickup
  | 'active'      // Currently rented
  | 'completed'   // Successfully returned
  | 'overdue'     // Past end time, not returned
  | 'cancelled'   // Cancelled
  | 'expired';    // Pending timed out

type DepositStatus = 'pending' | 'held' | 'released' | 'captured' | 'refunded';
type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
type SignatureType = 'typed' | 'smart_id' | 'mobile_id' | 'id_card';
```

---

## Booking Flow

### 1. Check Availability

```typescript
// Service
async checkAvailability(params: AvailabilityParams): Promise<AvailabilityResult> {
  const { productId, locationId, startAt, endAt } = params;

  // Find an available compartment with the product
  const compartment = await this.findAvailableCompartment(
    productId,
    locationId,
    startAt,
    endAt
  );

  if (!compartment) {
    // Find alternative slots
    const alternatives = await this.findAlternatives(productId, locationId, startAt);
    
    return {
      available: false,
      conflict: {
        type: 'no_availability',
        message: 'Antud ajavahemikus pole saadaval',
      },
      alternatives,
    };
  }

  // Calculate pricing
  const pricing = this.calculatePricing(product, startAt, endAt);

  return {
    available: true,
    compartment: {
      id: compartment.id,
      code: compartment.code,
      lockerCode: compartment.locker.code,
    },
    pricing,
  };
}

private async findAvailableCompartment(
  productId: string,
  locationId: string,
  startAt: Date,
  endAt: Date
): Promise<Compartment | null> {
  // Query for compartment with matching product and no conflicting bookings
  const result = await this.db.query(`
    SELECT c.* 
    FROM compartments c
    JOIN product_inventory pi ON pi.compartment_id = c.id
    JOIN lockers l ON c.locker_id = l.id
    WHERE pi.product_id = $1
      AND l.location_id = $2
      AND pi.status = 'available'
      AND c.status = 'available'
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.compartment_id = c.id
          AND b.status NOT IN ('cancelled', 'expired')
          AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange($3, $4, '[)')
      )
    ORDER BY c.code
    LIMIT 1
  `, [productId, locationId, startAt, endAt]);

  return result.rows[0] || null;
}
```

### 2. Create Booking

```typescript
async createBooking(
  dto: CreateBookingDto,
  userId: string,
  idempotencyKey?: string
): Promise<Booking> {
  // Check idempotency
  if (idempotencyKey) {
    const existing = await this.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing;
  }

  // Acquire distributed lock
  const lock = await this.redis.lock(`booking:${dto.compartmentId}`, 10000);
  if (!lock) {
    throw new BookingException('LOCK_FAILED', 'Could not acquire lock');
  }

  try {
    // Verify availability
    const available = await this.checkAvailability({
      productId: dto.productId,
      locationId: dto.locationId,
      startAt: dto.startAt,
      endAt: dto.endAt,
    });

    if (!available.available) {
      throw new BookingConflictException(available.conflict, available.alternatives);
    }

    // Get product and inventory
    const product = await this.productService.findById(dto.productId);
    const inventory = await this.inventoryService.findByCompartment(dto.compartmentId);

    // Calculate pricing
    const pricing = this.calculatePricing(product, dto.startAt, dto.endAt);

    // Create booking
    const booking = await this.bookingRepository.create({
      userId,
      productId: dto.productId,
      inventoryId: inventory.id,
      locationId: dto.locationId,
      compartmentId: dto.compartmentId,
      startAt: dto.startAt,
      endAt: dto.endAt,
      status: 'pending',
      ...pricing,
      expiresAt: addMinutes(new Date(), 15),
      idempotencyKey,
      source: dto.source || 'web',
      notes: dto.notes,
    });

    // Log state transition
    await this.logTransition(booking.id, null, 'pending', 'user', userId);

    // Reserve compartment
    await this.compartmentService.reserve(dto.compartmentId, booking.id);

    // Schedule expiration
    await this.scheduleExpiration(booking.id, booking.expiresAt);

    return booking;
  } catch (error) {
    // Handle constraint violation (race condition)
    if (error.code === '23P01') {
      throw new BookingConflictException({
        message: 'Ajavahemik broneeriti just. Palun proovige uuesti.',
      });
    }
    throw error;
  } finally {
    await lock.unlock();
  }
}
```

### 3. Confirm Booking (After Payment)

```typescript
async confirmBooking(
  bookingId: string,
  paymentId: string,
  contractId: string
): Promise<Booking> {
  const booking = await this.findById(bookingId);

  // Validate current state
  if (booking.status !== 'pending') {
    throw new InvalidStateException(
      `Cannot confirm booking in ${booking.status} state`
    );
  }

  // Update booking
  const updated = await this.bookingRepository.update(bookingId, {
    status: 'confirmed',
    paymentStatus: 'captured',
    contractSignedAt: new Date(),
    expiresAt: null, // Clear TTL
  });

  // Log transition
  await this.logTransition(bookingId, 'pending', 'confirmed', 'payment');

  // Generate access token
  await this.accessService.generateToken(booking);

  // Send confirmation
  await this.notificationService.send({
    userId: booking.userId,
    template: 'booking_confirmed',
    data: {
      bookingNumber: booking.bookingNumber,
      productName: booking.product.name,
      startAt: booking.startAt,
      endAt: booking.endAt,
      accessPin: await this.accessService.getPin(bookingId),
    },
  });

  // Schedule reminders
  await this.scheduleReminders(booking);

  return updated;
}
```

### 4. Activate Booking

```typescript
// Runs via scheduled job or triggered by door open
async activateBooking(bookingId: string): Promise<Booking> {
  const booking = await this.findById(bookingId);

  if (booking.status !== 'confirmed') {
    throw new InvalidStateException(
      `Cannot activate booking in ${booking.status} state`
    );
  }

  const updated = await this.bookingRepository.update(bookingId, {
    status: 'active',
    pickedUpAt: new Date(),
  });

  // Update inventory status
  await this.inventoryService.markRented(booking.inventoryId);

  // Update compartment status
  await this.compartmentService.markOccupied(booking.compartmentId);

  // Log transition
  await this.logTransition(bookingId, 'confirmed', 'active', 'system');

  return updated;
}
```

### 5. Complete Booking (Return)

```typescript
async completeBooking(
  bookingId: string,
  returnData: ReturnData
): Promise<Booking> {
  const booking = await this.findById(bookingId);

  if (!['active', 'overdue'].includes(booking.status)) {
    throw new InvalidStateException(
      `Cannot complete booking in ${booking.status} state`
    );
  }

  // Calculate any overdue charges
  let overdueCharges = 0;
  if (booking.status === 'overdue') {
    overdueCharges = this.calculateOverdueCharges(booking);
  }

  const updated = await this.bookingRepository.update(bookingId, {
    status: 'completed',
    returnedAt: new Date(),
    overdueCharges,
  });

  // Update inventory
  await this.inventoryService.markAvailable(booking.inventoryId);
  await this.inventoryService.incrementRentalCount(booking.inventoryId);

  // Update compartment
  await this.compartmentService.markAvailable(booking.compartmentId);

  // Schedule deposit release
  await this.depositService.scheduleRelease(bookingId, addDays(new Date(), 1));

  // Log transition
  await this.logTransition(bookingId, booking.status, 'completed', 'user');

  // Send confirmation
  await this.notificationService.send({
    userId: booking.userId,
    template: 'return_confirmed',
    data: {
      bookingNumber: booking.bookingNumber,
      depositRelease: 'Tagatisraha tagastatakse 3-5 tööpäeva jooksul',
    },
  });

  return updated;
}
```

---

## Pricing Calculation

```typescript
interface PricingResult {
  hourlyRate: number;
  dailyRate: number;
  subtotal: number;
  depositAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: 'EUR';
  breakdown: PricingBreakdown[];
}

calculatePricing(
  product: Product,
  startAt: Date,
  endAt: Date
): PricingResult {
  const durationHours = differenceInHours(endAt, startAt);
  const durationDays = Math.ceil(durationHours / 24);

  let subtotal: number;
  const breakdown: PricingBreakdown[] = [];

  // Determine best pricing (hourly vs daily vs weekly)
  if (durationHours <= 8) {
    // Use hourly rate
    subtotal = durationHours * product.hourlyRate;
    breakdown.push({
      description: `${durationHours} tundi × €${product.hourlyRate}`,
      amount: subtotal,
    });
  } else if (durationDays <= 6) {
    // Use daily rate
    subtotal = durationDays * product.dailyRate;
    breakdown.push({
      description: `${durationDays} päeva × €${product.dailyRate}`,
      amount: subtotal,
    });
  } else if (product.weeklyRate) {
    // Use weekly rate + remaining days
    const weeks = Math.floor(durationDays / 7);
    const remainingDays = durationDays % 7;
    
    const weeklyAmount = weeks * product.weeklyRate;
    const dailyAmount = remainingDays * product.dailyRate;
    
    subtotal = weeklyAmount + dailyAmount;
    
    if (weeks > 0) {
      breakdown.push({
        description: `${weeks} nädalat × €${product.weeklyRate}`,
        amount: weeklyAmount,
      });
    }
    if (remainingDays > 0) {
      breakdown.push({
        description: `${remainingDays} päeva × €${product.dailyRate}`,
        amount: dailyAmount,
      });
    }
  } else {
    subtotal = durationDays * product.dailyRate;
    breakdown.push({
      description: `${durationDays} päeva × €${product.dailyRate}`,
      amount: subtotal,
    });
  }

  // Deposit
  const depositAmount = product.depositAmount;
  if (depositAmount > 0) {
    breakdown.push({
      description: 'Tagatisraha (tagastatav)',
      amount: depositAmount,
    });
  }

  // Tax (22% Estonian VAT)
  const taxRate = 0.22;
  const taxAmount = subtotal * taxRate;
  breakdown.push({
    description: 'Käibemaks 22%',
    amount: taxAmount,
  });

  const totalAmount = subtotal + depositAmount + taxAmount;

  return {
    hourlyRate: product.hourlyRate,
    dailyRate: product.dailyRate,
    subtotal: round(subtotal, 2),
    depositAmount: round(depositAmount, 2),
    taxAmount: round(taxAmount, 2),
    totalAmount: round(totalAmount, 2),
    currency: 'EUR',
    breakdown,
  };
}
```

---

## Extension Handling

```typescript
async requestExtension(
  bookingId: string,
  newEndAt: Date,
  userId: string
): Promise<ExtensionResult> {
  const booking = await this.findById(bookingId);

  // Validate
  if (booking.userId !== userId) {
    throw new ForbiddenException('NOT_BOOKING_OWNER');
  }

  if (!['confirmed', 'active'].includes(booking.status)) {
    throw new InvalidStateException('Pikendamine pole selles staatuses võimalik');
  }

  if (newEndAt <= booking.endAt) {
    throw new ValidationException('Uus lõpuaeg peab olema hilisem');
  }

  // Check for conflicts
  const conflict = await this.checkConflict(
    booking.compartmentId,
    booking.endAt,
    newEndAt,
    bookingId
  );

  if (conflict) {
    return {
      success: false,
      conflict: {
        message: `Pikendamine pole võimalik. Järgmine broneering algab ${formatTime(conflict.startAt)}`,
        maxExtensionUntil: subMinutes(conflict.startAt, 30),
      },
    };
  }

  // Calculate additional cost
  const additionalPricing = this.calculatePricing(
    booking.product,
    booking.endAt,
    newEndAt
  );

  // Create extension record
  const extension = await this.extensionRepository.create({
    bookingId,
    originalEndAt: booking.endAt,
    newEndAt,
    additionalAmount: additionalPricing.subtotal + additionalPricing.taxAmount,
    status: 'pending',
  });

  return {
    success: true,
    extension: {
      id: extension.id,
      originalEndAt: booking.endAt,
      newEndAt,
      additionalHours: differenceInHours(newEndAt, booking.endAt),
      additionalAmount: extension.additionalAmount,
      paymentUrl: `/pay/extension/${extension.id}`,
    },
  };
}
```

---

## Overdue Detection

```typescript
// Scheduled job runs every 5 minutes
@Cron('*/5 * * * *')
async detectOverdueBookings() {
  const gracePeriodMinutes = 30;
  const overdueThreshold = subMinutes(new Date(), gracePeriodMinutes);

  const overdueBookings = await this.db.query(`
    SELECT * FROM bookings
    WHERE status = 'active'
      AND end_at < $1
  `, [overdueThreshold]);

  for (const booking of overdueBookings.rows) {
    await this.markOverdue(booking.id);
  }
}

async markOverdue(bookingId: string): Promise<void> {
  const booking = await this.findById(bookingId);

  if (booking.status !== 'active') return;

  // Update status
  await this.bookingRepository.update(bookingId, {
    status: 'overdue',
  });

  // Log transition
  await this.logTransition(bookingId, 'active', 'overdue', 'system');

  // Send notification
  await this.notificationService.send({
    userId: booking.userId,
    template: 'overdue_warning',
    channel: ['email', 'sms'],
    data: {
      bookingNumber: booking.bookingNumber,
      productName: booking.product.name,
      dueAt: booking.endAt,
      overdueBy: formatDuration(differenceInMinutes(new Date(), booking.endAt)),
    },
  });

  // Start overdue charges
  await this.chargeService.startOverdueAccumulation(bookingId);

  // Alert operations if significantly overdue
  const hoursOverdue = differenceInHours(new Date(), booking.endAt);
  if (hoursOverdue >= 4) {
    await this.alertService.send({
      level: 'high',
      title: 'Significantly Overdue Booking',
      details: {
        bookingNumber: booking.bookingNumber,
        hoursOverdue,
        customerName: booking.user.name,
        customerPhone: booking.user.phone,
      },
    });
  }
}
```

---

## Cancellation Rules

```typescript
async cancelBooking(
  bookingId: string,
  userId: string,
  reason: string
): Promise<CancellationResult> {
  const booking = await this.findById(bookingId);

  // Validate ownership
  if (booking.userId !== userId) {
    throw new ForbiddenException('NOT_BOOKING_OWNER');
  }

  // Validate state
  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw new InvalidStateException(
      'Tühistamine pole selles staatuses võimalik. Palun tagastage toode.'
    );
  }

  // Calculate refund based on timing
  const refund = this.calculateRefund(booking);

  // Update booking
  await this.bookingRepository.update(bookingId, {
    status: 'cancelled',
  });

  // Log transition
  await this.logTransition(bookingId, booking.status, 'cancelled', 'user', userId, reason);

  // Process refund if applicable
  if (refund.amount > 0) {
    await this.paymentService.refund(booking.paymentId, refund.amount, reason);
  }

  // Release compartment
  await this.compartmentService.release(booking.compartmentId);

  // Revoke access token
  await this.accessService.revoke(bookingId);

  // Send notification
  await this.notificationService.send({
    userId: booking.userId,
    template: 'booking_cancelled',
    data: {
      bookingNumber: booking.bookingNumber,
      refundAmount: refund.amount,
      refundMessage: refund.message,
    },
  });

  return {
    success: true,
    refund,
  };
}

calculateRefund(booking: Booking): RefundResult {
  if (booking.status === 'pending' || !booking.paymentStatus === 'captured') {
    return { amount: 0, message: 'Makseid ei ole tehtud' };
  }

  const hoursUntilStart = differenceInHours(booking.startAt, new Date());

  if (hoursUntilStart >= 24) {
    // Full refund
    return {
      amount: booking.totalAmount,
      percent: 100,
      message: 'Täielik tagasimakse 3-5 tööpäeva jooksul',
    };
  } else if (hoursUntilStart >= 12) {
    // 50% refund
    const amount = booking.subtotal * 0.5 + booking.depositAmount;
    return {
      amount,
      percent: 50,
      message: '50% tagasimakse (tühistamine vähem kui 24h enne)',
    };
  } else {
    // No refund, only deposit
    return {
      amount: booking.depositAmount,
      percent: 0,
      message: 'Ainult tagatisraha tagastatakse (tühistamine vähem kui 12h enne)',
    };
  }
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/bookings` | Create booking |
| `GET` | `/bookings/:id` | Get booking details |
| `GET` | `/bookings` | List user's bookings |
| `POST` | `/bookings/:id/extend` | Request extension |
| `POST` | `/bookings/:id/cancel` | Cancel booking |
| `POST` | `/bookings/:id/return` | Initiate return |
| `GET` | `/availability` | Check availability |

---

## Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `booking.created` | New booking | Full booking object |
| `booking.confirmed` | Payment + signature complete | Booking + access info |
| `booking.started` | Rental period begins | Booking |
| `booking.completed` | Return confirmed | Booking + duration |
| `booking.overdue` | Past end time | Booking + overdue duration |
| `booking.cancelled` | User/admin cancel | Booking + refund info |
| `booking.extended` | Extension approved | Booking + new end time |

---

## Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bookings_created_total` | Counter | Total bookings created |
| `bookings_confirmed_total` | Counter | Total confirmed bookings |
| `bookings_cancelled_total` | Counter | Total cancelled bookings |
| `bookings_overdue_total` | Counter | Total overdue bookings |
| `booking_duration_hours` | Histogram | Rental duration distribution |
| `booking_conversion_rate` | Gauge | Pending → Confirmed rate |
| `availability_check_duration_ms` | Histogram | Availability check latency |
