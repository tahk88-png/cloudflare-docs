# Rentbox v2 - Error Handling & Guardrails

> Plain language errors that always show the next step. No silent failures. Admin sees full truth.

## Core Principles

1. **Never hide problems** - All errors are logged and surfaced appropriately
2. **Plain language** - Users see human-readable messages, never error codes
3. **Next step always clear** - Every error message includes what to do next
4. **No silent failures** - Failed operations are retried or escalated
5. **Full audit trail** - Every error is logged with context
6. **Graceful degradation** - System continues operating even with partial failures

---

## Error Response Format

### User-Facing Error

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "See ajavahemik ei ole enam saadaval",
    "details": {
      "requested_start": "2024-01-20T09:00:00+02:00",
      "requested_end": "2024-01-20T17:00:00+02:00"
    },
    "suggested_action": "Varaseim saadaval aeg on 15:00. Kas soovite broneerida 15:00-23:00?",
    "alternatives": [
      {
        "start": "2024-01-20T15:00:00+02:00",
        "end": "2024-01-20T23:00:00+02:00"
      }
    ]
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Internal Error (Logged)

```json
{
  "request_id": "req_abc123",
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "error",
  "error_code": "BOOKING_CONFLICT",
  "message": "Booking conflict detected",
  "user_id": "usr_xyz789",
  "context": {
    "product_id": "prod_abc123",
    "compartment_id": "comp_def456",
    "requested_window": ["2024-01-20T09:00:00+02:00", "2024-01-20T17:00:00+02:00"],
    "conflicting_booking": "book_ghi789"
  },
  "stack_trace": "...",
  "service": "booking-service",
  "environment": "production"
}
```

---

## Error Categories

### 1. Validation Errors (400)

User input doesn't meet requirements.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `INVALID_EMAIL` | E-posti aadress on vigane | Palun kontrollige e-posti aadressi |
| `INVALID_PHONE` | Telefoninumber on vigane | Kasutage formaati +372XXXXXXXX |
| `PAST_DATE` | Algusaeg on minevikus | Valige tuleviku kuupäev |
| `DURATION_TOO_SHORT` | Minimaalne rendi kestus on {min} tundi | Pikendage rendi kestust |
| `DURATION_TOO_LONG` | Maksimaalne rendi kestus on {max} päeva | Lühendage rendi kestust |

```typescript
// Example validation
const validateBookingRequest = (data: BookingRequest): ValidationResult => {
  const errors: ValidationError[] = [];

  if (new Date(data.startAt) < new Date()) {
    errors.push({
      field: 'startAt',
      code: 'PAST_DATE',
      message: 'Algusaeg on minevikus',
      suggested_action: 'Valige tuleviku kuupäev',
    });
  }

  const durationHours = differenceInHours(
    new Date(data.endAt),
    new Date(data.startAt)
  );

  if (durationHours < product.min_rental_hours) {
    errors.push({
      field: 'endAt',
      code: 'DURATION_TOO_SHORT',
      message: `Minimaalne rendi kestus on ${product.min_rental_hours} tundi`,
      suggested_action: 'Pikendage rendi kestust',
    });
  }

  return { valid: errors.length === 0, errors };
};
```

### 2. Authentication Errors (401)

User is not authenticated.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `TOKEN_EXPIRED` | Teie seanss on aegunud | Palun logige uuesti sisse |
| `TOKEN_INVALID` | Vigane autentimistõend | Palun logige uuesti sisse |
| `SESSION_REVOKED` | Teie seanss on tühistatud | Palun logige uuesti sisse |

### 3. Authorization Errors (403)

User doesn't have permission.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `NOT_BOOKING_OWNER` | Teil pole sellele broneeringule ligipääsu | - |
| `ROLE_REQUIRED` | Teil pole selle toimingu jaoks õigusi | Võtke ühendust administraatoriga |
| `LOCATION_ACCESS_DENIED` | Teil pole sellele asukohale ligipääsu | - |

### 4. Resource Errors (404)

Resource not found.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `BOOKING_NOT_FOUND` | Broneeringut ei leitud | Kontrollige broneeringu numbrit |
| `PRODUCT_NOT_FOUND` | Toodet ei leitud | See toode ei ole enam saadaval |
| `LOCATION_NOT_FOUND` | Asukohta ei leitud | - |

### 5. Conflict Errors (409)

Operation conflicts with current state.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `BOOKING_CONFLICT` | See ajavahemik ei ole saadaval | Valige teine aeg |
| `ALREADY_CANCELLED` | Broneering on juba tühistatud | - |
| `ALREADY_RETURNED` | Toode on juba tagastatud | - |
| `BOOKING_NOT_ACTIVE` | Broneering ei ole aktiivne | Kappi saate avada vaid aktiivse broneeringu ajal |
| `EXTENSION_CONFLICT` | Pikendamine pole võimalik | Järgmine broneering algab {time} |

### 6. Payment Errors (402)

Payment required or failed.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `PAYMENT_REQUIRED` | Makse on vajalik | Palun lõpetage makse |
| `PAYMENT_FAILED` | Makse ebaõnnestus | Proovige teist makseviisi |
| `CARD_DECLINED` | Kaart lükati tagasi | Proovige teist kaarti |
| `INSUFFICIENT_FUNDS` | Ebapiisav kontojääk | Kontrollige oma kontojääki |

### 7. Hardware Errors (503)

Locker hardware issues.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `LOCKER_OFFLINE` | Kapp on ajutiselt kättesaamatu | Proovige mõne minuti pärast uuesti |
| `DOOR_STUCK` | Uks ei avane | Helistage tugiliinile {phone} |
| `DOOR_TIMEOUT` | Ukse avamine aegus | Proovige uuesti või kasutage PIN-koodi |
| `HARDWARE_ERROR` | Riistavara tõrge | Meie meeskond on teavitatud |

### 8. Rate Limit Errors (429)

Too many requests.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `RATE_LIMITED` | Liiga palju päringuid | Oodake {seconds} sekundit |

### 9. Server Errors (500)

Internal server errors.

| Code | Message (ET) | Suggested Action |
|------|--------------|------------------|
| `INTERNAL_ERROR` | Süsteemi viga | Meie meeskond on teavitatud. Proovige hiljem uuesti. |
| `DATABASE_ERROR` | Andmebaasi viga | Meie meeskond on teavitatud. |
| `EXTERNAL_SERVICE_ERROR` | Väline teenus pole saadaval | Proovige hiljem uuesti. |

---

## Error Handling Patterns

### 1. API Error Handler

```typescript
// api/common/filters/http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: LoggerService,
    private readonly alertService: AlertService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers['x-request-id'] || generateRequestId();
    
    // Determine error details
    const errorDetails = this.parseException(exception);
    
    // Log the error
    this.logger.error({
      request_id: requestId,
      error_code: errorDetails.code,
      message: errorDetails.internalMessage,
      user_id: request.user?.id,
      path: request.path,
      method: request.method,
      body: this.sanitizeBody(request.body),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Alert for critical errors
    if (errorDetails.severity === 'critical') {
      this.alertService.sendAlert({
        level: 'critical',
        title: `Critical Error: ${errorDetails.code}`,
        details: errorDetails,
        request_id: requestId,
      });
    }

    // Send user-friendly response
    response.status(errorDetails.httpStatus).json({
      success: false,
      error: {
        code: errorDetails.code,
        message: errorDetails.userMessage,
        details: errorDetails.publicDetails,
        suggested_action: errorDetails.suggestedAction,
        ...(errorDetails.alternatives && { alternatives: errorDetails.alternatives }),
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private parseException(exception: unknown): ErrorDetails {
    if (exception instanceof AppException) {
      return exception.toErrorDetails();
    }
    
    if (exception instanceof HttpException) {
      return this.httpExceptionToDetails(exception);
    }

    // Unknown error - log full details, show generic message
    return {
      code: 'INTERNAL_ERROR',
      httpStatus: 500,
      internalMessage: exception instanceof Error ? exception.message : 'Unknown error',
      userMessage: 'Süsteemi viga. Meie meeskond on teavitatud.',
      suggestedAction: 'Proovige hiljem uuesti.',
      severity: 'high',
    };
  }
}
```

### 2. Booking Conflict Handler

```typescript
// api/modules/booking/booking.service.ts
async createBooking(dto: CreateBookingDto, userId: string): Promise<Booking> {
  // Acquire distributed lock
  const lockKey = `booking:${dto.compartmentId}`;
  const lock = await this.redis.acquireLock(lockKey, 10000);
  
  if (!lock) {
    throw new BookingException(
      'BOOKING_CONFLICT',
      'Unable to acquire lock for compartment',
      { compartmentId: dto.compartmentId }
    );
  }

  try {
    // Check availability (with database constraint as backup)
    const isAvailable = await this.checkAvailability(
      dto.compartmentId,
      dto.startAt,
      dto.endAt
    );

    if (!isAvailable.available) {
      // Find alternatives
      const alternatives = await this.findAlternativeSlots(
        dto.productId,
        dto.locationId,
        dto.startAt,
        dto.endAt
      );

      throw new BookingConflictException({
        message: 'See ajavahemik ei ole enam saadaval',
        conflict: isAvailable.conflict,
        alternatives,
        suggestedAction: alternatives.length > 0
          ? `Varaseim saadaval aeg on ${formatTime(alternatives[0].start)}`
          : 'Palun valige teine kuupäev',
      });
    }

    // Create booking with database constraint protection
    try {
      return await this.bookingRepository.create({
        ...dto,
        userId,
        status: 'pending',
        expiresAt: addMinutes(new Date(), 15),
      });
    } catch (error) {
      // PostgreSQL exclusion constraint violation
      if (error.code === '23P01') {
        throw new BookingConflictException({
          message: 'See ajavahemik ei ole enam saadaval',
          suggestedAction: 'Broneering võidi just teha. Palun proovige uuesti.',
        });
      }
      throw error;
    }
  } finally {
    await lock.release();
  }
}
```

### 3. Locker Hardware Error Handler

```typescript
// api/modules/locker/locker.service.ts
async openDoor(
  compartmentId: string,
  bookingId: string,
  userId: string
): Promise<DoorOpenResult> {
  const booking = await this.validateAccess(compartmentId, bookingId, userId);
  
  // Log the attempt
  await this.logEvent({
    type: 'door_open_requested',
    compartmentId,
    bookingId,
    userId,
  });

  // Attempt to open door with retry
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.hardwareService.openDoor(compartmentId, {
        timeout: 10000,
        attempt,
      });

      if (result.success) {
        await this.logEvent({
          type: 'door_opened',
          compartmentId,
          bookingId,
          userId,
          attempt,
        });

        return { success: true, message: 'Uks avaneb' };
      }
    } catch (error) {
      lastError = error;
      
      await this.logEvent({
        type: 'door_open_failed',
        compartmentId,
        bookingId,
        userId,
        attempt,
        error: error.message,
      });

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  // All retries failed - offer fallback
  const fallbackPin = await this.generateFallbackPin(bookingId);
  
  // Create incident
  await this.incidentService.create({
    type: 'door_stuck',
    bookingId,
    compartmentId,
    severity: 'high',
    title: 'Ukse avamine ebaõnnestus',
    description: `Door open failed after ${maxRetries} attempts`,
    metadata: { lastError: lastError?.message },
  });

  // Notify operations team
  await this.alertService.send({
    level: 'high',
    title: 'Door Open Failure',
    details: { compartmentId, bookingId },
  });

  throw new LockerException(
    'DOOR_STUCK',
    'Ukse avamine ebaõnnestus pärast mitut katset',
    {
      suggestedAction: `Kasutage alternatiivset PIN-koodi: ${fallbackPin}. Kui probleem püsib, helistage: +372 600 1234`,
      fallbackPin,
      supportPhone: '+372 600 1234',
    }
  );
}
```

### 4. Payment Error Handler

```typescript
// api/modules/payment/payment.service.ts
async processPayment(bookingId: string): Promise<PaymentResult> {
  const booking = await this.bookingService.findById(bookingId);
  
  try {
    const result = await this.stripeService.confirmPayment({
      paymentIntentId: booking.paymentIntentId,
      idempotencyKey: `payment_${bookingId}`,
    });

    if (result.status === 'succeeded') {
      await this.bookingService.confirmPayment(bookingId);
      return { success: true };
    }

    throw new PaymentException('PAYMENT_FAILED', 'Payment not successful');
  } catch (error) {
    // Map Stripe errors to user-friendly messages
    const errorMapping = this.mapStripeError(error);
    
    await this.logPaymentFailure(bookingId, error);

    throw new PaymentException(
      errorMapping.code,
      errorMapping.userMessage,
      {
        suggestedAction: errorMapping.suggestedAction,
        canRetry: errorMapping.canRetry,
      }
    );
  }
}

private mapStripeError(error: Stripe.StripeError): ErrorMapping {
  const mappings: Record<string, ErrorMapping> = {
    'card_declined': {
      code: 'CARD_DECLINED',
      userMessage: 'Teie kaart lükati tagasi',
      suggestedAction: 'Proovige teist kaarti või võtke ühendust oma pangaga',
      canRetry: true,
    },
    'insufficient_funds': {
      code: 'INSUFFICIENT_FUNDS',
      userMessage: 'Kaardil pole piisavalt vahendeid',
      suggestedAction: 'Kontrollige oma kontojääki või kasutage teist kaarti',
      canRetry: true,
    },
    'expired_card': {
      code: 'CARD_EXPIRED',
      userMessage: 'Teie kaart on aegunud',
      suggestedAction: 'Kasutage kehtivat kaarti',
      canRetry: true,
    },
    'processing_error': {
      code: 'PAYMENT_PROCESSING_ERROR',
      userMessage: 'Makse töötlemisel tekkis viga',
      suggestedAction: 'Palun proovige mõne minuti pärast uuesti',
      canRetry: true,
    },
  };

  return mappings[error.code] || {
    code: 'PAYMENT_FAILED',
    userMessage: 'Makse ebaõnnestus',
    suggestedAction: 'Proovige teist makseviisi',
    canRetry: true,
  };
}
```

---

## Guardrails

### 1. Double Booking Prevention

```sql
-- Database-level constraint (ultimate protection)
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING GIST (
        compartment_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'expired'));
```

```typescript
// Application-level check (for user-friendly errors)
async checkAvailability(compartmentId, startAt, endAt): Promise<AvailabilityResult> {
  const conflict = await this.db.query(`
    SELECT id, booking_number, start_at, end_at
    FROM bookings
    WHERE compartment_id = $1
      AND status NOT IN ('cancelled', 'expired')
      AND tstzrange(start_at, end_at, '[)') && tstzrange($2, $3, '[)')
    LIMIT 1
  `, [compartmentId, startAt, endAt]);

  if (conflict.rows.length > 0) {
    return {
      available: false,
      conflict: {
        type: 'booking_exists',
        blockedUntil: conflict.rows[0].end_at,
      },
    };
  }

  return { available: true };
}
```

### 2. Pending Booking TTL

```typescript
// Automatic expiration job (runs every minute)
@Cron('* * * * *')
async expirePendingBookings() {
  const expired = await this.db.query(`
    UPDATE bookings
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at < NOW()
    RETURNING id, booking_number
  `);

  for (const booking of expired.rows) {
    this.logger.info(`Expired pending booking: ${booking.booking_number}`);
    
    // Release the compartment reservation
    await this.compartmentService.release(booking.compartment_id);
    
    // Log the state transition
    await this.logStateTransition(booking.id, 'pending', 'expired', 'system');
  }
}
```

### 3. Access Validation

```typescript
// Strict access validation before any locker operation
async validateAccess(
  compartmentId: string,
  bookingId: string,
  userId: string
): Promise<Booking> {
  const booking = await this.bookingRepository.findOne({
    where: { id: bookingId },
    relations: ['user', 'compartment'],
  });

  // Check 1: Booking exists
  if (!booking) {
    throw new AccessDeniedException('BOOKING_NOT_FOUND');
  }

  // Check 2: User owns booking
  if (booking.userId !== userId) {
    await this.logSecurityEvent('unauthorized_access_attempt', {
      bookingId,
      requestingUserId: userId,
      ownerUserId: booking.userId,
    });
    throw new AccessDeniedException('NOT_BOOKING_OWNER');
  }

  // Check 3: Correct compartment
  if (booking.compartmentId !== compartmentId) {
    throw new AccessDeniedException('WRONG_COMPARTMENT');
  }

  // Check 4: Booking status allows access
  const now = new Date();
  const accessWindowStart = subMinutes(booking.startAt, 30); // 30 min early access
  const accessWindowEnd = addMinutes(booking.endAt, 60); // 60 min grace period

  if (booking.status === 'pending') {
    throw new AccessDeniedException('BOOKING_NOT_CONFIRMED', {
      message: 'Palun lõpetage kõigepealt makse',
    });
  }

  if (booking.status === 'cancelled' || booking.status === 'expired') {
    throw new AccessDeniedException('BOOKING_CANCELLED');
  }

  if (booking.status === 'completed') {
    throw new AccessDeniedException('BOOKING_COMPLETED', {
      message: 'See broneering on juba lõpetatud',
    });
  }

  if (now < accessWindowStart) {
    throw new AccessDeniedException('TOO_EARLY', {
      message: `Kappi saate avada alates ${formatTime(accessWindowStart)}`,
      accessAllowedFrom: accessWindowStart,
    });
  }

  if (now > accessWindowEnd && booking.status !== 'overdue') {
    throw new AccessDeniedException('ACCESS_EXPIRED', {
      message: 'Ligipääsu aeg on lõppenud. Võtke ühendust toega.',
    });
  }

  return booking;
}
```

### 4. Idempotency

```typescript
// Idempotent booking creation
async createBooking(dto: CreateBookingDto, idempotencyKey: string) {
  // Check for existing request with same key
  const existing = await this.db.query(`
    SELECT id, status FROM bookings
    WHERE idempotency_key = $1
  `, [idempotencyKey]);

  if (existing.rows.length > 0) {
    // Return existing booking (idempotent behavior)
    return this.findById(existing.rows[0].id);
  }

  // Create new booking with idempotency key
  return this.bookingRepository.create({
    ...dto,
    idempotencyKey,
  });
}
```

### 5. Audit Logging

```typescript
// Every critical action is logged
@Injectable()
export class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    await this.db.query(`
      INSERT INTO audit_log (
        user_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      JSON.stringify(entry.oldValues),
      JSON.stringify(entry.newValues),
      entry.ipAddress,
      entry.userAgent,
      entry.requestId,
    ]);
  }
}

// Usage in service
async updateBooking(id: string, updates: Partial<Booking>, userId: string) {
  const oldBooking = await this.findById(id);
  const newBooking = await this.bookingRepository.update(id, updates);

  await this.auditService.log({
    userId,
    action: 'update',
    resourceType: 'booking',
    resourceId: id,
    oldValues: oldBooking,
    newValues: newBooking,
  });

  return newBooking;
}
```

---

## Edge Cases

### 1. Clock Skew / Timezone Issues

```typescript
// All times stored as timestamptz
// Always use server time for comparisons
// Display in user's timezone (default: Europe/Tallinn)

const formatForUser = (date: Date, timezone = 'Europe/Tallinn') => {
  return formatInTimeZone(date, timezone, 'dd.MM.yyyy HH:mm');
};

// DST handling - use date-fns-tz
const isDST = (date: Date, timezone: string) => {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const janOffset = getTimezoneOffset(timezone, jan);
  const julOffset = getTimezoneOffset(timezone, jul);
  const dateOffset = getTimezoneOffset(timezone, date);
  return dateOffset !== Math.max(janOffset, julOffset);
};
```

### 2. Concurrent Modifications

```typescript
// Optimistic locking with version field
async updateBooking(id: string, updates: Partial<Booking>, expectedVersion: number) {
  const result = await this.db.query(`
    UPDATE bookings
    SET ..., version = version + 1
    WHERE id = $1 AND version = $2
    RETURNING *
  `, [id, expectedVersion]);

  if (result.rowCount === 0) {
    throw new ConcurrentModificationException(
      'Broneering on vahepeal muutunud. Palun laadige leht uuesti.'
    );
  }

  return result.rows[0];
}
```

### 3. Network Failures During Payment

```typescript
// Use Stripe webhooks as source of truth
@Post('webhooks/stripe')
async handleStripeWebhook(@Body() body: Buffer, @Headers() headers: any) {
  const event = this.stripe.webhooks.constructEvent(
    body,
    headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      // This is the authoritative confirmation
      await this.paymentService.confirmPayment(
        event.data.object.metadata.booking_id,
        event.data.object.id
      );
      break;

    case 'payment_intent.payment_failed':
      await this.paymentService.handleFailure(
        event.data.object.metadata.booking_id,
        event.data.object.last_payment_error
      );
      break;
  }
}
```

### 4. Locker Offline During Active Rental

```typescript
// Fallback access mechanism
async getFallbackAccess(bookingId: string): Promise<FallbackAccess> {
  const booking = await this.validateBooking(bookingId);
  
  // Generate time-limited manual override code
  const overrideCode = this.generateSecureCode(6);
  
  // Store with TTL
  await this.redis.setex(
    `fallback:${booking.compartmentId}`,
    3600, // 1 hour TTL
    overrideCode
  );

  // Log for audit
  await this.logEvent({
    type: 'fallback_access_generated',
    bookingId,
    compartmentId: booking.compartmentId,
  });

  return {
    code: overrideCode,
    validUntil: addHours(new Date(), 1),
    instructions: 'Sisestage kood kapi klaviatuuril',
    supportPhone: '+372 600 1234',
  };
}
```

### 5. User Abandons Return Flow

```typescript
// Scheduled job to detect unreturned items
@Cron('*/5 * * * *')
async detectOverdueBookings() {
  const overdueBookings = await this.db.query(`
    SELECT * FROM bookings
    WHERE status = 'active'
      AND end_at < NOW() - INTERVAL '30 minutes'
  `);

  for (const booking of overdueBookings.rows) {
    // Update status
    await this.updateStatus(booking.id, 'overdue');

    // Send notification
    await this.notificationService.send({
      userId: booking.user_id,
      template: 'overdue_warning',
      channel: ['email', 'sms'],
      data: {
        bookingNumber: booking.booking_number,
        productName: booking.product_name,
        overdueBy: formatDuration(differenceInMinutes(new Date(), booking.end_at)),
      },
    });

    // Start overdue charges
    await this.chargeService.startOverdueAccumulation(booking.id);
  }
}
```

---

## What The System Must NEVER Do

| Never | Why | Instead |
|-------|-----|---------|
| Guess availability | Could cause double booking | Always check database |
| Auto-book without user action | Users must control decisions | Require explicit confirmation |
| Auto-pay without confirmation | Legal/financial implications | Require explicit payment action |
| Hide conflicts | Users must know the truth | Show clear conflict message with alternatives |
| Change user intent | Trust the user's decisions | AI suggests, never overwrites |
| Optimize for persuasion | Trust is more important than conversion | Show honest availability |
| Delete audit logs | Legal requirement, dispute resolution | Soft delete only, retain forever |
| Silent failures | Problems must surface | Log, alert, retry, or fail visibly |
| Trust client-side time | Could be manipulated | Use server time for all decisions |
| Cache availability aggressively | Stale data causes conflicts | Short TTL, real-time for booking |
