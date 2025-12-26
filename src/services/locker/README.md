# Locker Access Service

Physical locker control service for Rentbox.ee that decouples hardware from booking logic.

## Features

- ✅ Open/close locker with retry logic
- ✅ Timeout handling
- ✅ Fallback access (PIN/SMS)
- ✅ Event logging
- ✅ Booking validation
- ✅ Admin override support

## API Endpoints

### POST /api/locker/open

Open a locker.

**Request Body:**
```json
{
  "locker_id": "locker-001",
  "booking_id": "booking-123",
  "user_id": "user-456",
  "admin_api_key": "optional-admin-key"
}
```

**Response:**
```json
{
  "success": true,
  "locker_id": "locker-001",
  "action": "open",
  "result": "success",
  "event_id": "event-uuid",
  "fallback_available": false,
  "message": "open successful"
}
```

### POST /api/locker/close

Close a locker.

**Request Body:**
```json
{
  "locker_id": "locker-001",
  "booking_id": "booking-123",
  "user_id": "user-456",
  "admin_api_key": "optional-admin-key"
}
```

### GET /api/locker/status?locker_id=locker-001

Get locker status.

**Response:**
```json
{
  "locker_id": "locker-001",
  "is_open": false,
  "is_available": true,
  "last_action": "close",
  "last_action_time": "2024-01-01T12:00:00Z",
  "hardware_status": "online",
  "booking_id": "booking-123"
}
```

## Database Setup

1. Create a D1 database:
```bash
wrangler d1 create rentbox-lockers
```

2. Run the migration:
```bash
wrangler d1 execute rentbox-lockers --file=./migrations/001_create_locker_events.sql
```

3. Add to `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "rentbox-lockers"
database_id = "your-database-id"
```

## Environment Variables

Add these to your Cloudflare Workers environment:

- `HARDWARE_ENDPOINT` - Hardware API endpoint (optional)
- `SMS_API_KEY` - SMS provider API key (optional)
- `SMS_ENDPOINT` - SMS provider endpoint (optional)
- `BOOKING_API_ENDPOINT` - Booking service API endpoint (optional)
- `BOOKING_API_KEY` - Booking service API key (optional)
- `ADMIN_API_KEY` - Admin override API key (optional)

## Architecture

### Components

1. **Hardware Controller** (`hardware.ts`)
   - Handles physical locker communication
   - Implements retry logic (3 retries by default)
   - Timeout handling (5 seconds default)

2. **Fallback Access** (`fallback.ts`)
   - PIN generation for hardware failures
   - SMS delivery (optional)
   - PIN validation

3. **Booking Validation** (`booking.ts`)
   - Validates active bookings
   - Checks time windows
   - Verifies locker assignment

4. **Event Logging** (`database.ts`)
   - All actions logged to `locker_events` table
   - Includes retry counts, errors, fallback methods
   - Supports admin override tracking

5. **Main Service** (`service.ts`)
   - Orchestrates all components
   - Enforces business rules
   - Handles admin overrides

## Business Rules

1. **Access Control**: Only active bookings can access lockers (unless admin override)
2. **Event Logging**: All actions are logged with full context
3. **Admin Override**: Hardware failures never block admin access
4. **Fallback**: When hardware fails, PIN fallback is available for opening lockers

## Usage Example

```typescript
import { LockerAccessService } from "~/services/locker/service";
import { D1Database } from "~/services/locker/database";
import { LockerHardwareController } from "~/services/locker/hardware";
import { FallbackAccessService } from "~/services/locker/fallback";
import { BookingValidationService } from "~/services/locker/booking";

const lockerService = new LockerAccessService({
  database: new D1Database(env.DB),
  hardware: new LockerHardwareController({
    hardwareEndpoint: env.HARDWARE_ENDPOINT,
  }),
  fallback: new FallbackAccessService({
    smsProvider: {
      apiKey: env.SMS_API_KEY,
      endpoint: env.SMS_ENDPOINT,
    },
  }),
  booking: new BookingValidationService(
    env.BOOKING_API_ENDPOINT,
    env.BOOKING_API_KEY,
  ),
  enableFallback: true,
  adminApiKey: env.ADMIN_API_KEY,
});

// Open locker
const result = await lockerService.openLocker({
  locker_id: "locker-001",
  booking_id: "booking-123",
  user_id: "user-456",
});
```

## Testing

The service includes fallback behavior for development:
- Hardware controller simulates hardware responses if no endpoint configured
- Booking service returns mock bookings if no API configured
- All components are designed to work in isolation

## Security Notes

- Admin API keys should be stored securely
- PINs expire after 15 minutes (configurable)
- All access attempts are logged for audit
- Booking validation prevents unauthorized access
