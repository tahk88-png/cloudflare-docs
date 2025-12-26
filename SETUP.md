# Feature Flags & Maintenance Mode Setup Guide

## Quick Start

### 1. Database Setup

Create a D1 database and apply the schema:

```bash
# Create database
npx wrangler d1 create rentbox-flags

# Apply schema (local development)
npx wrangler d1 execute rentbox-flags --local --file=./schema.sql

# Apply schema (production)
npx wrangler d1 execute rentbox-flags --file=./schema.sql
```

### 2. Configure wrangler.toml

Add D1 binding to your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "rentbox-flags"
database_id = "your-database-id-here"
```

### 3. Update Astro Config

Ensure your `astro.config.ts` has the platform adapter configured for Cloudflare:

```typescript
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  // ... rest of config
});
```

### 4. Set Up Admin Users

Insert admin users into the database:

```sql
INSERT INTO admin_users (user_id, email, can_bypass_maintenance)
VALUES 
  ('admin-123', 'admin@rentbox.com', 1),
  ('admin-456', 'ops@rentbox.com', 1);
```

### 5. Configure Authentication

Update the `isAuthorized` functions in:
- `/src/pages/api/admin/system/flags.ts`
- `/src/pages/api/admin/system/maintenance.ts`
- `/src/pages/api/admin/system/health.ts`
- `/src/pages/api/admin/system/audit-logs.ts`

Replace the placeholder authentication with your actual auth mechanism (Cloudflare Access, JWT, etc.).

## Integration Examples

### Example 1: Protect a Route

```typescript
// src/pages/api/booking.ts
import { FeatureFlagsService } from "~/lib/feature-flags/service";

export async function POST({ request, platform }) {
  const service = new FeatureFlagsService(platform.env.DB);
  
  if (!await service.getFlag("enable_booking")) {
    return new Response(
      JSON.stringify({ error: "Booking is currently disabled" }),
      { status: 503 }
    );
  }
  
  // Booking logic here
}
```

### Example 2: Use Middleware

The middleware can be integrated into your existing middleware:

```typescript
// src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import { featureFlagsMiddleware, createMiddlewareContext } from "~/lib/feature-flags/middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const db = context.locals.platform?.env?.DB;
  
  if (db) {
    const context = createMiddlewareContext(context.request, db);
    const result = await featureFlagsMiddleware(context, {
      checkMaintenance: true,
    });
    
    if (!result.allowed) {
      return new Response(result.message, { status: result.status || 503 });
    }
  }
  
  return next();
});
```

### Example 3: Conditional UI Rendering

```typescript
// In your Astro component
---
import { FeatureFlagsService } from "~/lib/feature-flags/service";

const service = new FeatureFlagsService(Astro.locals.platform?.env?.DB);
const discountsEnabled = await service.getFlag("enable_discounts");
---

{discountsEnabled && (
  <div>
    <input type="text" placeholder="Discount code" />
  </div>
)}
```

### Example 4: Service Health Monitoring

Set up a cron job or health check endpoint:

```typescript
// src/pages/api/health-check.ts
import { FeatureFlagsService } from "~/lib/feature-flags/service";

export async function GET({ platform }) {
  const service = new FeatureFlagsService(platform.env.DB);
  
  // Check locker service
  const lockerHealthy = await checkLockerService();
  await service.updateServiceHealth(
    "locker",
    lockerHealthy ? "healthy" : "degraded"
  );
  
  // Check payments service
  const paymentsHealthy = await checkPaymentsService();
  await service.updateServiceHealth(
    "payments",
    paymentsHealthy ? "healthy" : "degraded"
  );
  
  return new Response(JSON.stringify({ status: "ok" }));
}
```

## Testing

### Test Feature Flags

```bash
# Get current flags
curl http://localhost:1111/api/system/flags

# Update a flag (requires auth)
curl -X POST http://localhost:1111/api/admin/system/flags \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -H "x-user-email: admin@rentbox.com" \
  -d '{
    "flags": {
      "enable_booking": false
    },
    "reason": "Testing maintenance"
  }'
```

### Test Maintenance Mode

```bash
# Enable partial maintenance
curl -X POST http://localhost:1111/api/admin/system/maintenance \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{
    "mode": "partial",
    "enabled": true,
    "message": "Scheduled maintenance",
    "reason": "Database migration"
  }'
```

### Test Service Health

```bash
# Mark locker service as degraded
curl -X POST http://localhost:1111/api/admin/system/health \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{
    "serviceName": "locker",
    "status": "degraded"
  }'
```

## Production Checklist

- [ ] Create production D1 database
- [ ] Apply schema to production database
- [ ] Configure D1 binding in production wrangler.toml
- [ ] Set up proper authentication for admin endpoints
- [ ] Add admin users to database
- [ ] Set up service health monitoring
- [ ] Configure alerts for service degradation
- [ ] Test maintenance mode with admin bypass
- [ ] Review audit logs regularly
- [ ] Document your authentication setup

## Monitoring

### View Audit Logs

```bash
curl http://localhost:1111/api/admin/system/audit-logs?limit=50 \
  -H "x-user-id: admin-123"
```

### Monitor Service Health

Query the `service_health` table:

```sql
SELECT * FROM service_health ORDER BY updated_at DESC;
```

## Troubleshooting

### Flags not updating

- Check cache TTL (default 5 seconds)
- Verify database connection
- Check audit logs for errors

### Maintenance mode not working

- Verify `enabled` is set to `true`
- Check middleware is properly integrated
- Verify admin bypass permissions

### Failsafe not triggering

- Ensure service health is being updated
- Check `service_health` table has correct service names
- Verify failsafe rules in `service.ts`

## Support

For issues, check:
1. Audit logs for recent changes
2. Service health status
3. Database connection
4. Authentication configuration
