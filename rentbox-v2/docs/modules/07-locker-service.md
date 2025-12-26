# Module 7: Locker Access Service

> Hardware integration for physical locker control. Every operation is logged. System must work 24/7.

## Overview

The locker service bridges the software system with physical locker hardware:
- Door open/close commands
- Access validation
- Event logging
- Fallback mechanisms
- Health monitoring

## Core Principles

1. **Access only if booking is active** - No exceptions
2. **Every event is logged** - Immutable audit trail
3. **Hardware failures don't hide truth** - Booking state is always accurate
4. **Fallback access available** - System never locks out valid customers
5. **Retry with backoff** - Transient failures are handled gracefully

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Locker Service                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Access     │    │   Command    │    │    Event     │       │
│  │  Validator   │───▶│   Handler    │───▶│   Logger     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                  Hardware Adapter                     │       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐      │       │
│  │  │   MQTT     │  │   HTTP     │  │  Polling   │      │       │
│  │  │  Client    │  │  Client    │  │  Service   │      │       │
│  │  └────────────┘  └────────────┘  └────────────┘      │       │
│  └──────────────────────────────────────────────────────┘       │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Physical Locker │
                    │    Hardware      │
                    └──────────────────┘
```

---

## Data Model

### Access Token

```typescript
interface AccessToken {
  id: string;
  bookingId: string;
  compartmentId: string;
  
  tokenHash: string;         // Hashed PIN/code
  tokenType: 'pin' | 'qr' | 'nfc' | 'app';
  
  validFrom: Date;
  validUntil: Date;
  
  maxUses: number;           // Typically 2 (pickup + return)
  useCount: number;
  lastUsedAt?: Date;
  
  status: 'active' | 'used' | 'expired' | 'revoked';
  
  createdAt: Date;
}
```

### Locker Event

```typescript
interface LockerEvent {
  id: number;                // bigserial
  
  lockerId: string;
  compartmentId?: string;
  bookingId?: string;
  userId?: string;
  
  eventType: LockerEventType;
  
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  
  hardwareState: Record<string, unknown>;
  
  triggeredBy: 'user' | 'system' | 'admin' | 'hardware' | 'scheduled';
  requestId?: string;
  
  createdAt: Date;           // Immutable timestamp
}

type LockerEventType =
  // Door events
  | 'door_open_requested'
  | 'door_open_authorized'
  | 'door_open_denied'
  | 'door_opening'
  | 'door_opened'
  | 'door_open_failed'
  | 'door_open_timeout'
  | 'door_closed'
  | 'door_left_open_warning'
  | 'door_forced_open'
  
  // Access events
  | 'access_granted'
  | 'access_denied'
  | 'pin_entered'
  | 'pin_failed'
  | 'token_validated'
  | 'token_rejected'
  
  // System events
  | 'heartbeat'
  | 'online'
  | 'offline'
  | 'error'
  | 'maintenance_start'
  | 'maintenance_end'
  | 'firmware_update';
```

---

## Access Flow

### 1. Open Door Request

```typescript
async openDoor(
  compartmentId: string,
  bookingId: string,
  userId: string,
  requestId: string
): Promise<DoorOpenResult> {
  // Log the request
  await this.logEvent({
    type: 'door_open_requested',
    compartmentId,
    bookingId,
    userId,
    requestId,
    triggeredBy: 'user',
  });

  // Validate access
  const validation = await this.validateAccess(
    compartmentId,
    bookingId,
    userId
  );

  if (!validation.valid) {
    await this.logEvent({
      type: 'door_open_denied',
      compartmentId,
      bookingId,
      userId,
      requestId,
      success: false,
      errorCode: validation.reason,
      triggeredBy: 'user',
    });

    throw new AccessDeniedException(validation.reason, {
      message: validation.message,
      suggestedAction: validation.suggestedAction,
    });
  }

  await this.logEvent({
    type: 'door_open_authorized',
    compartmentId,
    bookingId,
    userId,
    requestId,
    triggeredBy: 'user',
  });

  // Attempt to open door with retries
  return this.executeOpenCommand(compartmentId, bookingId, userId, requestId);
}
```

### 2. Access Validation

```typescript
async validateAccess(
  compartmentId: string,
  bookingId: string,
  userId: string
): Promise<ValidationResult> {
  const booking = await this.bookingService.findById(bookingId);

  // Check 1: Booking exists
  if (!booking) {
    return {
      valid: false,
      reason: 'BOOKING_NOT_FOUND',
      message: 'Broneeringut ei leitud',
    };
  }

  // Check 2: User owns booking
  if (booking.userId !== userId) {
    return {
      valid: false,
      reason: 'NOT_OWNER',
      message: 'Teil pole sellele kapile ligipääsu',
    };
  }

  // Check 3: Correct compartment
  if (booking.compartmentId !== compartmentId) {
    return {
      valid: false,
      reason: 'WRONG_COMPARTMENT',
      message: 'Vale kapp. Teie broneering on kapil ' + booking.compartment.code,
    };
  }

  // Check 4: Booking is in valid state
  const now = new Date();
  const accessStart = subMinutes(booking.startAt, 30);  // 30 min early
  const accessEnd = addMinutes(booking.endAt, 60);      // 60 min grace

  if (booking.status === 'pending') {
    return {
      valid: false,
      reason: 'NOT_PAID',
      message: 'Palun lõpetage kõigepealt makse',
      suggestedAction: 'Minge tagasi maksma',
    };
  }

  if (['cancelled', 'expired'].includes(booking.status)) {
    return {
      valid: false,
      reason: 'BOOKING_CANCELLED',
      message: 'See broneering on tühistatud',
    };
  }

  if (booking.status === 'completed') {
    return {
      valid: false,
      reason: 'BOOKING_COMPLETED',
      message: 'See broneering on juba lõpetatud',
    };
  }

  if (now < accessStart) {
    return {
      valid: false,
      reason: 'TOO_EARLY',
      message: `Kappi saate avada alates ${formatTime(accessStart)}`,
      suggestedAction: `Palun tulge tagasi ${formatTime(accessStart)}`,
    };
  }

  if (now > accessEnd && booking.status !== 'overdue') {
    return {
      valid: false,
      reason: 'ACCESS_EXPIRED',
      message: 'Ligipääsuaeg on lõppenud',
      suggestedAction: 'Võtke ühendust klienditoega: +372 600 1234',
    };
  }

  // Check 5: Token is valid
  const token = await this.tokenService.findActive(bookingId);
  if (!token || token.status !== 'active') {
    return {
      valid: false,
      reason: 'TOKEN_INVALID',
      message: 'Teie ligipääsukood on aegunud',
      suggestedAction: 'Võtke ühendust klienditoega',
    };
  }

  return { valid: true };
}
```

### 3. Execute Open Command

```typescript
private async executeOpenCommand(
  compartmentId: string,
  bookingId: string,
  userId: string,
  requestId: string
): Promise<DoorOpenResult> {
  const compartment = await this.compartmentService.findById(compartmentId);
  const locker = await this.lockerService.findById(compartment.lockerId);

  // Check locker is online
  if (locker.status !== 'online') {
    return this.handleOfflineLocker(compartmentId, bookingId, userId, requestId);
  }

  // Retry configuration
  const maxRetries = 3;
  const timeouts = [5000, 8000, 12000]; // Increasing timeouts
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.logEvent({
        type: 'door_opening',
        compartmentId,
        bookingId,
        userId,
        requestId,
        triggeredBy: 'system',
        hardwareState: { attempt },
      });

      // Send command to hardware
      const result = await this.hardwareAdapter.openDoor(
        locker.serialNumber,
        compartment.number,
        { timeout: timeouts[attempt - 1] }
      );

      if (result.success) {
        await this.logEvent({
          type: 'door_opened',
          compartmentId,
          bookingId,
          userId,
          requestId,
          success: true,
          triggeredBy: 'hardware',
          hardwareState: result.state,
        });

        // Update compartment state
        await this.compartmentService.update(compartmentId, {
          isDoorOpen: true,
          lastOpenedAt: new Date(),
        });

        // Increment token usage
        await this.tokenService.incrementUsage(bookingId);

        // If this is first open and booking is confirmed, activate it
        const booking = await this.bookingService.findById(bookingId);
        if (booking.status === 'confirmed') {
          await this.bookingService.activate(bookingId);
        }

        return {
          success: true,
          message: 'Uks avaneb. Palun võtke toode 60 sekundi jooksul.',
          doorStatus: 'opening',
        };
      }

      lastError = new Error(result.error || 'Door open failed');
    } catch (error) {
      lastError = error;

      await this.logEvent({
        type: 'door_open_failed',
        compartmentId,
        bookingId,
        userId,
        requestId,
        success: false,
        errorCode: error.code,
        errorMessage: error.message,
        triggeredBy: 'hardware',
        hardwareState: { attempt },
      });

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  // All retries failed - provide fallback
  return this.handleDoorFailure(compartmentId, bookingId, userId, requestId, lastError);
}
```

### 4. Handle Door Failure

```typescript
private async handleDoorFailure(
  compartmentId: string,
  bookingId: string,
  userId: string,
  requestId: string,
  error: Error | null
): Promise<DoorOpenResult> {
  // Create incident
  const incident = await this.incidentService.create({
    type: 'door_stuck',
    bookingId,
    compartmentId,
    severity: 'high',
    title: 'Ukse avamine ebaõnnestus',
    description: `Failed after 3 attempts. Error: ${error?.message}`,
  });

  // Generate fallback PIN
  const fallbackPin = await this.generateFallbackPin(compartmentId, bookingId);

  // Send SMS to user
  await this.notificationService.send({
    userId,
    channel: 'sms',
    template: 'door_failure_fallback',
    data: {
      fallbackPin,
      supportPhone: '+372 600 1234',
    },
  });

  // Alert operations
  await this.alertService.send({
    level: 'high',
    title: 'Door Open Failure',
    details: {
      compartmentId,
      bookingId,
      incidentNumber: incident.incidentNumber,
      attempts: 3,
      error: error?.message,
    },
  });

  throw new LockerException('DOOR_STUCK', 'Ukse avamine ebaõnnestus', {
    message: 'Meil on riistvaratõrge. Palun proovige alternatiivset meetodit.',
    suggestedAction: `Sisestage kapi klaviatuuril PIN: ${fallbackPin}`,
    fallbackPin,
    supportPhone: '+372 600 1234',
    incidentNumber: incident.incidentNumber,
  });
}
```

---

## PIN/Access Token Management

### Generate Token

```typescript
async generateToken(booking: Booking): Promise<AccessToken> {
  // Generate secure 6-digit PIN
  const pin = this.generateSecurePin(6);
  const tokenHash = await bcrypt.hash(pin, 10);

  // Create token with validity window
  const token = await this.tokenRepository.create({
    bookingId: booking.id,
    compartmentId: booking.compartmentId,
    tokenHash,
    tokenType: 'pin',
    validFrom: subMinutes(booking.startAt, 30),
    validUntil: addMinutes(booking.endAt, 60),
    maxUses: 2,
    useCount: 0,
    status: 'active',
  });

  // Store plain PIN in Redis for display (encrypted)
  await this.redis.setex(
    `pin:${booking.id}`,
    differenceInSeconds(token.validUntil, new Date()),
    encrypt(pin)
  );

  return token;
}

async getPin(bookingId: string): Promise<string | null> {
  const encrypted = await this.redis.get(`pin:${bookingId}`);
  if (!encrypted) return null;
  return decrypt(encrypted);
}

private generateSecurePin(length: number): string {
  const chars = '0123456789';
  let pin = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    pin += chars[randomIndex];
  }
  return pin;
}
```

### Validate PIN Entry

```typescript
async validatePinEntry(
  lockerId: string,
  compartmentNumber: number,
  enteredPin: string
): Promise<PinValidationResult> {
  // Find compartment
  const compartment = await this.compartmentService.findByLockerAndNumber(
    lockerId,
    compartmentNumber
  );

  if (!compartment) {
    await this.logEvent({
      type: 'pin_failed',
      lockerId,
      success: false,
      errorCode: 'INVALID_COMPARTMENT',
    });
    return { valid: false, reason: 'INVALID_COMPARTMENT' };
  }

  // Find active booking for this compartment
  const booking = await this.bookingService.findActiveByCompartment(compartment.id);

  if (!booking) {
    await this.logEvent({
      type: 'pin_failed',
      compartmentId: compartment.id,
      success: false,
      errorCode: 'NO_ACTIVE_BOOKING',
    });
    return { valid: false, reason: 'NO_ACTIVE_BOOKING' };
  }

  // Find active token
  const token = await this.tokenService.findActive(booking.id);

  if (!token) {
    await this.logEvent({
      type: 'pin_failed',
      compartmentId: compartment.id,
      bookingId: booking.id,
      success: false,
      errorCode: 'NO_VALID_TOKEN',
    });
    return { valid: false, reason: 'NO_VALID_TOKEN' };
  }

  // Verify PIN
  const isValid = await bcrypt.compare(enteredPin, token.tokenHash);

  if (!isValid) {
    await this.logEvent({
      type: 'pin_failed',
      compartmentId: compartment.id,
      bookingId: booking.id,
      success: false,
      errorCode: 'INVALID_PIN',
    });
    return { valid: false, reason: 'INVALID_PIN' };
  }

  // Check usage limits
  if (token.useCount >= token.maxUses) {
    await this.logEvent({
      type: 'pin_failed',
      compartmentId: compartment.id,
      bookingId: booking.id,
      success: false,
      errorCode: 'MAX_USES_EXCEEDED',
    });
    return { valid: false, reason: 'MAX_USES_EXCEEDED' };
  }

  // Success
  await this.logEvent({
    type: 'pin_entered',
    compartmentId: compartment.id,
    bookingId: booking.id,
    userId: booking.userId,
    success: true,
  });

  return {
    valid: true,
    booking,
    compartment,
  };
}
```

---

## Hardware Adapter

### MQTT Protocol

```typescript
// hardware-adapter/mqtt.adapter.ts
@Injectable()
export class MqttHardwareAdapter implements HardwareAdapter {
  private client: mqtt.Client;

  async openDoor(
    lockerSerial: string,
    doorNumber: number,
    options: CommandOptions
  ): Promise<CommandResult> {
    const requestId = generateRequestId();
    const topic = `locker/${lockerSerial}/door/${doorNumber}/command`;
    const responseTopic = `locker/${lockerSerial}/door/${doorNumber}/response`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.client.unsubscribe(responseTopic);
        reject(new TimeoutError('Door command timeout'));
      }, options.timeout);

      // Subscribe to response
      this.client.subscribe(responseTopic, (err) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
          return;
        }

        // Handle response
        const handler = (topic: string, message: Buffer) => {
          const response = JSON.parse(message.toString());
          if (response.requestId === requestId) {
            clearTimeout(timeout);
            this.client.unsubscribe(responseTopic);
            this.client.removeListener('message', handler);

            if (response.success) {
              resolve({ success: true, state: response.state });
            } else {
              reject(new Error(response.error));
            }
          }
        };

        this.client.on('message', handler);

        // Send command
        this.client.publish(topic, JSON.stringify({
          action: 'open',
          requestId,
          timestamp: new Date().toISOString(),
        }));
      });
    });
  }

  async getDoorStatus(
    lockerSerial: string,
    doorNumber: number
  ): Promise<DoorStatus> {
    // Query current state
    const topic = `locker/${lockerSerial}/door/${doorNumber}/status`;
    // ... implementation
  }
}
```

### HTTP Protocol (Alternative)

```typescript
// hardware-adapter/http.adapter.ts
@Injectable()
export class HttpHardwareAdapter implements HardwareAdapter {
  async openDoor(
    lockerSerial: string,
    doorNumber: number,
    options: CommandOptions
  ): Promise<CommandResult> {
    const url = `${this.baseUrl}/lockers/${lockerSerial}/doors/${doorNumber}/open`;

    try {
      const response = await axios.post(url, {
        timestamp: new Date().toISOString(),
      }, {
        timeout: options.timeout,
        headers: {
          'X-API-Key': this.apiKey,
          'X-Request-ID': generateRequestId(),
        },
      });

      return {
        success: response.data.success,
        state: response.data.state,
      };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new TimeoutError('Door command timeout');
      }
      throw error;
    }
  }
}
```

---

## Health Monitoring

### Heartbeat Processing

```typescript
// Runs every minute, checks for missing heartbeats
@Cron('* * * * *')
async checkLockerHealth() {
  const offlineThreshold = 5; // minutes

  const lockers = await this.lockerRepository.findAll();

  for (const locker of lockers) {
    const lastHeartbeat = locker.lastHeartbeat;
    const minutesSinceHeartbeat = lastHeartbeat
      ? differenceInMinutes(new Date(), lastHeartbeat)
      : Infinity;

    if (minutesSinceHeartbeat > offlineThreshold && locker.status === 'online') {
      // Mark as offline
      await this.lockerRepository.update(locker.id, { status: 'offline' });

      await this.logEvent({
        type: 'offline',
        lockerId: locker.id,
        triggeredBy: 'scheduled',
        hardwareState: { lastHeartbeat, minutesSince: minutesSinceHeartbeat },
      });

      // Alert operations
      await this.alertService.send({
        level: 'high',
        title: 'Locker Offline',
        details: {
          lockerCode: locker.code,
          locationName: locker.location.name,
          lastHeartbeat,
        },
      });

      // Create incident if prolonged
      if (minutesSinceHeartbeat > 15) {
        await this.incidentService.create({
          type: 'locker_offline',
          lockerId: locker.id,
          severity: 'high',
          title: `Locker ${locker.code} offline`,
          description: `No heartbeat for ${minutesSinceHeartbeat} minutes`,
        });
      }
    } else if (minutesSinceHeartbeat <= offlineThreshold && locker.status === 'offline') {
      // Back online
      await this.lockerRepository.update(locker.id, { status: 'online' });

      await this.logEvent({
        type: 'online',
        lockerId: locker.id,
        triggeredBy: 'scheduled',
      });

      // Resolve any open incidents
      await this.incidentService.resolveByLocker(locker.id, 'locker_offline', 'Locker back online');
    }
  }
}
```

### Heartbeat Handler

```typescript
@OnEvent('locker.heartbeat')
async handleHeartbeat(payload: HeartbeatPayload) {
  const { lockerSerial, state, timestamp } = payload;

  const locker = await this.lockerRepository.findBySerial(lockerSerial);
  if (!locker) {
    this.logger.warn(`Unknown locker heartbeat: ${lockerSerial}`);
    return;
  }

  // Update heartbeat time
  await this.lockerRepository.update(locker.id, {
    lastHeartbeat: new Date(timestamp),
    status: 'online',
  });

  // Log heartbeat
  await this.logEvent({
    type: 'heartbeat',
    lockerId: locker.id,
    triggeredBy: 'hardware',
    hardwareState: state,
  });

  // Update compartment states if included
  if (state.doors) {
    for (const door of state.doors) {
      await this.compartmentService.updateDoorState(
        locker.id,
        door.number,
        door.isOpen
      );
    }
  }
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/lockers/:compartmentId/open` | Request door open |
| `GET` | `/lockers/:compartmentId/status` | Get door status |
| `GET` | `/bookings/:id/access` | Get access info (PIN, etc.) |
| `POST` | `/lockers/:compartmentId/close` | Request door close (if supported) |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/lockers` | List all lockers |
| `GET` | `/admin/lockers/:id` | Get locker details |
| `POST` | `/admin/lockers/:id/maintenance` | Set maintenance mode |
| `GET` | `/admin/lockers/:id/events` | Get locker events |
| `POST` | `/admin/lockers/:id/override` | Admin door override |

---

## Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `locker.door_opened` | Door opened | Compartment, booking |
| `locker.door_closed` | Door closed | Compartment |
| `locker.offline` | Lost heartbeat | Locker |
| `locker.online` | Heartbeat restored | Locker |
| `locker.error` | Hardware error | Locker, error |
| `locker.access_denied` | Invalid access attempt | Compartment, reason |

---

## Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `locker_door_opens_total` | Counter | Door open attempts |
| `locker_door_opens_success` | Counter | Successful opens |
| `locker_door_opens_failed` | Counter | Failed opens |
| `locker_door_open_duration_ms` | Histogram | Open command latency |
| `locker_offline_count` | Gauge | Currently offline lockers |
| `locker_heartbeat_age_seconds` | Gauge | Time since last heartbeat |
