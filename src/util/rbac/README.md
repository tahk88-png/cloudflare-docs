# Role-Based Access Control (RBAC) System

A comprehensive RBAC system following the least privilege principle, designed to scale safely with team size.

## Features

- **Three Roles**: Admin, Operator, Technician
- **Five Permissions**: View bookings, Modify bookings, Open lockers, Manage incidents, View payments
- **Audit Logging**: All role changes are automatically logged
- **No Hardcoded Permissions**: All permission checks go through the RBAC system
- **Scalable Architecture**: Abstracted storage layer ready for database integration

## Roles and Permissions

### Admin
- Full access to all features
- Can manage user roles
- Can view audit logs
- Permissions: `view_bookings`, `modify_bookings`, `open_lockers`, `manage_incidents`, `view_payments`

### Operator
- Can manage bookings and incidents
- Can view payments
- Permissions: `view_bookings`, `modify_bookings`, `manage_incidents`, `view_payments`

### Technician
- Can view bookings
- Can open lockers
- Can manage incidents
- Permissions: `view_bookings`, `open_lockers`, `manage_incidents`

## API Endpoints

### GET /api/me/permissions
Returns the current user's permissions.

**Headers:**
- `Authorization: Bearer <user-id>` or `X-User-Id: <user-id>`

**Response:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "permissions": ["view_bookings", "modify_bookings", ...]
}
```

### GET /api/admin/roles
Returns all available roles and their permissions. Requires admin access.

**Headers:**
- `Authorization: Bearer <admin-user-id>`

**Response:**
```json
{
  "roles": [
    {
      "role": "admin",
      "permissions": ["view_bookings", "modify_bookings", ...],
      "description": "Full administrative access"
    },
    ...
  ]
}
```

### PUT /api/admin/users/[userId]/role
Updates a user's role. Requires admin access. Automatically logs the change.

**Headers:**
- `Authorization: Bearer <admin-user-id>`

**Body:**
```json
{
  "role": "operator"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "operator"
  },
  "message": "Role updated successfully"
}
```

### GET /api/admin/audit-logs
Returns audit logs for role changes. Requires admin access.

**Headers:**
- `Authorization: Bearer <admin-user-id>`

**Query Parameters:**
- `userId` (optional): Filter logs by user ID

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "action": "role_changed",
      "previousRole": "technician",
      "newRole": "operator",
      "changedBy": "admin-user-id",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    ...
  ]
}
```

## Usage Examples

### Check Permissions

```typescript
import { getCurrentUser } from "~/util/rbac/auth";
import { hasPermission } from "~/util/rbac/permissions";

const user = await getCurrentUser(request);
const check = hasPermission(user, "modify_bookings");

if (check.hasPermission) {
  // User can modify bookings
}
```

### Protect API Routes

```typescript
import { requirePermission } from "~/util/rbac/middleware";

export const POST: APIRoute = async ({ request }) => {
  const auth = await requirePermission("modify_bookings")(request);
  const user = auth.user;
  
  // User is authenticated and has permission
  // ... your logic here
};
```

### Check Multiple Permissions

```typescript
import { requireAllPermissions, requireAnyPermission } from "~/util/rbac/middleware";

// Require all permissions
const auth = await requireAllPermissions(["view_bookings", "modify_bookings"])(request);

// Require any permission
const auth = await requireAnyPermission(["view_bookings", "open_lockers"])(request);
```

## Architecture

### Storage Layer
The storage layer is abstracted, allowing easy integration with:
- Cloudflare D1 (SQLite)
- Cloudflare KV
- PostgreSQL
- MongoDB
- Any other database

Currently uses in-memory storage for development.

### Audit Logging
All role changes are automatically logged with:
- User ID
- Action type (role_assigned, role_removed, role_changed)
- Previous role (if applicable)
- New role
- Changed by (admin user ID)
- Timestamp
- Optional metadata

## Initialization

Initialize the RBAC system on application startup:

```typescript
import { initializeRBAC } from "~/util/rbac/init";

await initializeRBAC();
```

This creates default admin user and logs available roles.

## Security Best Practices

1. **Least Privilege**: Roles only have necessary permissions
2. **Audit Logging**: All role changes are logged
3. **No Hardcoded Permissions**: All checks go through the RBAC system
4. **Scalable**: System designed to handle team growth
5. **Type Safety**: Full TypeScript support

## Future Enhancements

- Database integration (D1/KV)
- Role hierarchies
- Custom permissions per user
- Permission expiration
- Multi-tenant support
