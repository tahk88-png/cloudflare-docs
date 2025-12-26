# Feature Flags & Maintenance Mode System

A comprehensive runtime control system for Rentbox v2 that allows safe feature toggling and maintenance mode management without redeployments.

## Features

- **Feature Flags**: Toggle features on/off at runtime
- **Maintenance Mode**: Full or partial maintenance with admin bypass
- **Failsafe Mechanisms**: Auto-disable features when services degrade
- **Audit Logging**: Track all changes with who/when/why
- **Server-Side Evaluation**: Flags evaluated server-side for security
- **Caching**: Short TTL caching for performance

## Database Setup

### 1. Create D1 Database

```bash
# Create database
npx wrangler d1 create rentbox-flags

# Apply schema
npx wrangler d1 execute rentbox-flags --file=./schema.sql
```

### 2. Update wrangler.toml

Add D1 binding to your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "rentbox-flags"
database_id = "your-database-id"
```

## API Endpoints

### Public Endpoints

#### GET `/api/system/flags`
Get current feature flags and maintenance status.

**Response:**
```json
{
  "flags": {
    "enable_booking": true,
    "enable_checkout": true,
    "enable_discounts": true,
    "enable_vouchers": true,
    "enable_sms": true,
    "enable_locker_access": true,
    "enable_notifications": true
  },
  "maintenance": {
    "mode": "none",
    "enabled": false,
    "message": null
  }
}
```

### Admin Endpoints

#### POST `/api/admin/system/flags`
Update feature flags.

**Headers:**
- `Authorization: Bearer <token>` (or `x-user-id` header)
- `x-user-id`: User ID
- `x-user-email`: User email

**Request:**
```json
{
  "flags": {
    "enable_booking": false,
    "enable_checkout": true
  },
  "reason": "Testing new booking flow"
}
```

#### POST `/api/admin/system/maintenance`
Update maintenance mode.

**Request:**
```json
{
  "mode": "partial",
  "enabled": true,
  "message": "Scheduled maintenance in progress",
  "reason": "Database migration"
}
```

**Modes:**
- `none`: Normal operation
- `partial`: Browsing allowed, checkout disabled
- `full`: All public access blocked (admins can bypass)

#### POST `/api/admin/system/health`
Update service health status (triggers failsafe).

**Request:**
```json
{
  "serviceName": "locker",
  "status": "degraded"
}
```

**Statuses:**
- `healthy`: Service operating normally
- `degraded`: Service experiencing issues
- `down`: Service unavailable

#### GET `/api/admin/system/audit-logs`
Get audit logs.

**Query Parameters:**
- `limit`: Number of logs (default: 100)
- `offset`: Pagination offset (default: 0)
- `entity_type`: Filter by entity type

## Usage Examples

### 1. Check Feature Flag in API Route

```typescript
import { FeatureFlagsService } from "~/lib/feature-flags/service";

export async function POST({ request, platform }) {
  const service = new FeatureFlagsService(platform.env.DB);
  
  const bookingEnabled = await service.getFlag("enable_booking");
  if (!bookingEnabled) {
    return new Response(
      JSON.stringify({ error: "Booking is currently disabled" }),
      { status: 503 }
    );
  }
  
  // Proceed with booking...
}
```

### 2. Use Middleware

The middleware automatically checks maintenance mode and can check required flags:

```typescript
import { featureFlagsMiddleware } from "~/lib/feature-flags/middleware";

// In your route handler
const result = await featureFlagsMiddleware(context, {
  requiredFlags: ["enable_checkout"],
  checkMaintenance: true
});

if (!result.allowed) {
  return new Response(result.message, { status: result.status });
}
```

### 3. Conditional Feature Rendering

```typescript
const service = new FeatureFlagsService(db);
const discountsEnabled = await service.getFlag("enable_discounts");

if (discountsEnabled) {
  // Render discount UI
}
```

### 4. Update Service Health (Failsafe)

```typescript
// When locker service degrades
await service.updateServiceHealth("locker", "degraded");

// Automatically disables enable_locker_access flag
```

## Admin UI

Access the admin panel at `/admin/system`:

- **Feature Flags Panel**: Toggle individual features
- **Maintenance Mode Panel**: Set maintenance mode and message
- **Audit Logs Panel**: View change history

## Failsafe Rules

The system automatically applies failsafe rules:

- **Locker service degraded/down** → Auto-disables `enable_locker_access`
- **Payments service degraded/down** → Auto-disables `enable_checkout`

## Authentication

**Important**: The current implementation uses placeholder authentication. You must implement proper authentication:

1. **Cloudflare Access**: Recommended for Cloudflare Workers
2. **JWT Tokens**: Validate tokens in admin endpoints
3. **Session-based**: Use secure session management

Update the `isAuthorized` functions in:
- `/src/pages/api/admin/system/flags.ts`
- `/src/pages/api/admin/system/maintenance.ts`
- `/src/pages/api/admin/system/health.ts`
- `/src/pages/api/admin/system/audit-logs.ts`

## Caching

Feature flags are cached with a 5-second TTL for performance. Cache is automatically invalidated when flags are updated.

## Audit Logging

All changes are logged with:
- Action type
- Entity (flag/maintenance/service)
- Old and new values
- User information (ID, email)
- Reason for change
- IP address and user agent
- Timestamp

## Maintenance Mode Behavior

### None (Normal)
- All features available
- No restrictions

### Partial
- Users can browse the site
- Checkout and booking endpoints return 503
- Admin users can bypass

### Full
- All public requests return 503
- Admin users with bypass permission can access
- Useful for emergency maintenance

## Feature Flags

Available flags:
- `enable_booking`: Booking functionality
- `enable_checkout`: Checkout process
- `enable_discounts`: Discount codes
- `enable_vouchers`: Voucher redemption
- `enable_sms`: SMS notifications
- `enable_locker_access`: Locker access
- `enable_notifications`: Push notifications

## Development

### Local Development

1. Start local D1 database:
```bash
npx wrangler d1 execute rentbox-flags --local --file=./schema.sql
```

2. Run dev server:
```bash
npm run dev
```

### Testing

Test the endpoints:

```bash
# Get flags
curl http://localhost:1111/api/system/flags

# Update flag (requires auth)
curl -X POST http://localhost:1111/api/admin/system/flags \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{"flags": {"enable_booking": false}, "reason": "Testing"}'
```

## Production Deployment

1. Create production D1 database
2. Apply schema
3. Configure authentication
4. Set up monitoring for service health
5. Configure admin users in `admin_users` table

## Security Considerations

- All admin endpoints require authentication
- Feature flags are evaluated server-side
- Audit logs capture all changes
- Admin bypass requires explicit permission
- IP addresses and user agents are logged

## Monitoring

Monitor service health and automatically update:

```typescript
// Example health check
const lockerHealth = await checkLockerService();
await service.updateServiceHealth("locker", lockerHealth ? "healthy" : "degraded");
```

## Support

For issues or questions, refer to the audit logs to track changes and identify issues.
