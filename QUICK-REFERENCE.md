# Feature Flags & Maintenance Mode - Quick Reference

## Common Operations

### Get Current Flags
```bash
curl http://localhost:1111/api/system/flags
```

### Disable a Feature
```bash
curl -X POST http://localhost:1111/api/admin/system/flags \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{"flags": {"enable_booking": false}, "reason": "Emergency disable"}'
```

### Enable Maintenance Mode (Partial)
```bash
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

### Enable Full Maintenance
```bash
curl -X POST http://localhost:1111/api/admin/system/maintenance \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{
    "mode": "full",
    "enabled": true,
    "message": "Emergency maintenance",
    "reason": "Critical bug fix"
  }'
```

### Disable Maintenance Mode
```bash
curl -X POST http://localhost:1111/api/admin/system/maintenance \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{
    "mode": "none",
    "enabled": false,
    "reason": "Maintenance complete"
  }'
```

### Mark Service as Degraded (Triggers Failsafe)
```bash
# Locker service degraded → auto-disables enable_locker_access
curl -X POST http://localhost:1111/api/admin/system/health \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{"serviceName": "locker", "status": "degraded"}'

# Payments service degraded → auto-disables enable_checkout
curl -X POST http://localhost:1111/api/admin/system/health \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-123" \
  -d '{"serviceName": "payments", "status": "degraded"}'
```

### View Audit Logs
```bash
curl http://localhost:1111/api/admin/system/audit-logs?limit=50 \
  -H "x-user-id: admin-123"
```

## Code Examples

### Check Flag in API Route
```typescript
import { FeatureFlagsService } from "~/lib/feature-flags/service";

const service = new FeatureFlagsService(platform.env.DB);
if (!await service.getFlag("enable_booking")) {
  return new Response("Booking disabled", { status: 503 });
}
```

### Use Middleware
```typescript
import { featureFlagsMiddleware, createMiddlewareContext } from "~/lib/feature-flags/middleware";

const context = createMiddlewareContext(request, db);
const result = await featureFlagsMiddleware(context, {
  requiredFlags: ["enable_checkout"],
  checkMaintenance: true
});

if (!result.allowed) {
  return new Response(result.message, { status: result.status });
}
```

### Conditional Rendering
```typescript
const service = new FeatureFlagsService(db);
const discountsEnabled = await service.getFlag("enable_discounts");

{discountsEnabled && <DiscountInput />}
```

## SQL Queries

### View All Flags
```sql
SELECT * FROM feature_flags ORDER BY flag_key;
```

### View Maintenance Mode
```sql
SELECT * FROM maintenance_mode ORDER BY id DESC LIMIT 1;
```

### View Service Health
```sql
SELECT * FROM service_health ORDER BY updated_at DESC;
```

### View Recent Audit Logs
```sql
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

### Add Admin User
```sql
INSERT INTO admin_users (user_id, email, can_bypass_maintenance)
VALUES ('user-123', 'admin@rentbox.com', 1);
```

## Feature Flag Keys

- `enable_booking`
- `enable_checkout`
- `enable_discounts`
- `enable_vouchers`
- `enable_sms`
- `enable_locker_access`
- `enable_notifications`

## Maintenance Modes

- `none` - Normal operation
- `partial` - Browsing allowed, checkout disabled
- `full` - All public access blocked

## Service Statuses

- `healthy` - Normal operation
- `degraded` - Issues detected (triggers failsafe)
- `down` - Service unavailable (triggers failsafe)

## Failsafe Rules

- **Locker service degraded/down** → Disables `enable_locker_access`
- **Payments service degraded/down** → Disables `enable_checkout`

## Admin UI

Access at: `/admin/system`

- Feature Flags Panel
- Maintenance Mode Panel
- Audit Logs Panel
