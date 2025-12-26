# Incident Management Module

**Purpose**: Track real-world problems. Replace memory with facts.

## Overview

The Incident Management module provides a comprehensive system for tracking and managing incidents in your application. Incidents are never deleted, ensuring a complete audit trail for all problems.

## Features

- **Incident Creation**: Auto or manual incident creation
- **Severity Levels**: low, medium, high, critical
- **Status Tracking**: open, investigating, resolved
- **Linked Resources**: Connect incidents to bookings and lockers
- **Resolution Notes**: Track how incidents were resolved
- **Full Audit Trail**: Every change is logged with timestamp and user
- **Admin-Only Access**: Secure admin endpoints for incident management

## Incident Types

- `locker_not_open` - Locker did not open
- `payment_access_failed` - Payment succeeded but access failed
- `tool_damaged` - Tool damaged
- `missing_return` - Missing return

## API Endpoints

### Create Incident

```http
POST /api/incidents
Content-Type: application/json

{
  "type": "locker_not_open",
  "severity": "high",
  "description": "User reported locker #42 did not open after payment",
  "booking_id": "booking-123",
  "locker_id": "locker-42",
  "created_by": "user-456" // Optional, defaults to system
}
```

**Response**: `201 Created` with incident object

### List Incidents (Admin Only)

```http
GET /api/admin/incidents?status=open&severity=high&limit=50&offset=0&include_audit=true
X-Admin-Token: your-admin-token
```

**Query Parameters**:
- `status` - Filter by status (open, investigating, resolved)
- `severity` - Filter by severity (low, medium, high, critical)
- `booking_id` - Filter by booking ID
- `locker_id` - Filter by locker ID
- `limit` - Results per page (1-100, default: 50)
- `offset` - Pagination offset (default: 0)
- `include_audit` - Include full audit trail (true/false)

**Response**: `200 OK` with incidents list

### Get Incident (Admin Only)

```http
GET /api/admin/incidents/{id}
X-Admin-Token: your-admin-token
```

**Response**: `200 OK` with incident and audit log

### Update Incident (Admin Only)

```http
PUT /api/admin/incidents/{id}
X-Admin-Token: your-admin-token
Content-Type: application/json

{
  "status": "resolved",
  "severity": "medium",
  "resolution_notes": "Fixed locker mechanism, tested successfully"
}
```

**Response**: `200 OK` with updated incident

## Setup Instructions

### 1. Create D1 Database

```bash
npx wrangler d1 create incidents-db
```

This will output a database ID. Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "INCIDENTS_DB"
database_name = "incidents-db"
database_id = "your-database-id-here"
```

### 2. Run Database Migration

```bash
npx wrangler d1 execute incidents-db --file=./schema.sql
```

For local development:

```bash
npx wrangler d1 execute incidents-db --local --file=./schema.sql
```

### 3. Set Admin Token (Optional)

Set the admin token as a secret:

```bash
npx wrangler secret put ADMIN_TOKEN
```

Or set it in `wrangler.toml` for local development (not recommended for production):

```toml
[vars]
ADMIN_TOKEN = "your-secure-admin-token"
```

### 4. Install Cloudflare Adapter (If Needed)

If your Astro site needs SSR or API routes on Cloudflare:

```bash
npm install @astrojs/cloudflare
```

Then update `astro.config.ts`:

```typescript
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  // ... other config
  output: "server",
  adapter: cloudflare(),
});
```

## Authentication

### Admin Authentication

Admin endpoints require authentication via one of:

1. **Header**: `X-Admin-Token: your-admin-token`
2. **Bearer Token**: `Authorization: Bearer your-admin-token`

The admin token is checked against the `ADMIN_TOKEN` environment variable.

### User Identification

For incident creation, user identification can be provided via:

1. **Request Body**: `created_by` field
2. **Header**: `X-User-ID: user-id`
3. **Authorization**: `Authorization: User user-id`
4. **Default**: `"system"` for auto-created incidents

## Database Schema

### Incidents Table

- `id` - UUID primary key
- `type` - Incident type (enum)
- `severity` - Severity level (enum)
- `status` - Current status (enum)
- `booking_id` - Optional booking reference
- `locker_id` - Optional locker reference
- `description` - Incident description
- `resolution_notes` - Optional resolution details
- `created_by` - User who created the incident
- `created_at` - Unix timestamp
- `updated_at` - Unix timestamp
- `resolved_at` - Optional resolution timestamp

### Audit Log Table

- `id` - Auto-increment primary key
- `incident_id` - Foreign key to incidents
- `action` - Action type (created, updated, status_changed, etc.)
- `changed_by` - User who made the change
- `old_value` - Previous value (if applicable)
- `new_value` - New value (if applicable)
- `notes` - Additional notes
- `created_at` - Unix timestamp

## Rules

1. **Incidents Never Deleted**: All incidents are preserved for audit purposes
2. **Full Audit Trail**: Every change creates an audit log entry
3. **Admin-Only Access**: Admin endpoints require authentication
4. **Immutable History**: Audit logs are append-only

## Example Usage

### Create an Incident

```typescript
const response = await fetch("/api/incidents", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "locker_not_open",
    severity: "high",
    description: "Locker #42 failed to open after successful payment",
    booking_id: "booking-123",
    locker_id: "locker-42",
  }),
});

const incident = await response.json();
```

### List Open Incidents (Admin)

```typescript
const response = await fetch("/api/admin/incidents?status=open", {
  headers: {
    "X-Admin-Token": process.env.ADMIN_TOKEN,
  },
});

const { incidents, total } = await response.json();
```

### Update Incident Status (Admin)

```typescript
const response = await fetch(`/api/admin/incidents/${incidentId}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Token": process.env.ADMIN_TOKEN,
  },
  body: JSON.stringify({
    status: "resolved",
    resolution_notes: "Fixed locker mechanism",
  }),
});

const updatedIncident = await response.json();
```

## Development

### Local Development

1. Start local D1 database:
   ```bash
   npx wrangler d1 execute incidents-db --local --file=./schema.sql
   ```

2. Run Astro dev server:
   ```bash
   npm run dev
   ```

3. Test endpoints:
   ```bash
   curl -X POST http://localhost:1111/api/incidents \
     -H "Content-Type: application/json" \
     -d '{"type":"locker_not_open","severity":"high","description":"Test incident"}'
   ```

## Production Deployment

1. Ensure D1 database is created and configured
2. Run migrations on production database
3. Set `ADMIN_TOKEN` as a secret
4. Deploy with `npm run build` and `npx wrangler deploy`

## Files Structure

```
src/
  lib/
    incidents/
      db.ts          # Database operations
      validation.ts  # Request validation
      auth.ts        # Authentication utilities
      runtime.ts     # Runtime environment helpers
  pages/
    api/
      incidents.ts                    # POST /api/incidents
      admin/
        incidents.ts                  # GET /api/admin/incidents
        incidents/[id].ts            # GET/PUT /api/admin/incidents/:id
  types/
    incidents.ts     # TypeScript types
schema.sql           # Database schema
```
