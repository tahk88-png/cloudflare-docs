# Role-Based Access Control (RBAC)

Complete security model for Rentbox v2 including authentication, authorization, digital signing, and threat mitigation.

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────┐
│             ADMIN                   │ ← Full system access
└─────────────────┬───────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │                           │
┌───▼────────┐          ┌──────▼──────┐
│  OPERATOR  │          │ TECHNICIAN  │
└───┬────────┘          └──────┬──────┘
    │                          │
    └──────────┬───────────────┘
               │
        ┌──────▼────────┐
        │   CUSTOMER    │ ← Default role
        └───────────────┘
```

---

### Customer Role

**Default role for all registered users.**

**Permissions:**
```typescript
const CUSTOMER_PERMISSIONS = [
  // Self-service booking
  'booking:create',
  'booking:read:own',
  'booking:cancel:own',
  'booking:extend:own',
  
  // Payment
  'payment:create:own',
  'payment:read:own',
  
  // Return
  'return:initiate:own',
  'return:read:own',
  
  // Profile
  'profile:read:own',
  'profile:update:own',
  
  // Documents
  'invoice:read:own',
  'agreement:read:own',
  'agreement:sign:own',
  
  // Notifications
  'notification:read:own',
  'notification:preferences:update:own'
];
```

**Restrictions:**
- Can only access own data
- Cannot view other users
- Cannot access admin functions
- Cannot modify system settings

**Example Code:**
```typescript
// Check if user can cancel booking
async function canCancelBooking(userId: string, bookingId: string): Promise<boolean> {
  const booking = await getBooking(bookingId);
  return booking.user_id === userId;
}
```

---

### Technician Role

**Field technicians who maintain physical hardware.**

**Permissions:**
```typescript
const TECHNICIAN_PERMISSIONS = [
  ...CUSTOMER_PERMISSIONS, // Inherit customer permissions
  
  // Hardware management
  'locker:read',
  'locker:update:status',
  'locker:test',
  'compartment:read',
  'compartment:update:status',
  'compartment:unlock', // Emergency access
  
  // Maintenance
  'maintenance_block:create',
  'maintenance_block:read',
  'maintenance_block:update',
  'maintenance_block:delete',
  
  // Incidents
  'incident:read',
  'incident:update:assigned',
  'incident:comment',
  'incident:resolve',
  
  // Access logs
  'access_log:read'
];
```

**Use Cases:**
- Respond to locker failures
- Perform scheduled maintenance
- Unlock compartments manually
- Test hardware after repairs
- Update locker firmware

**Restrictions:**
- Cannot modify bookings
- Cannot process refunds
- Cannot access customer personal data
- Cannot change user roles

---

### Operator Role

**Customer support and operations staff.**

**Permissions:**
```typescript
const OPERATOR_PERMISSIONS = [
  ...CUSTOMER_PERMISSIONS, // Inherit customer permissions
  
  // Booking management
  'booking:read:all',
  'booking:update', // Status changes, extensions
  'booking:cancel', // With refund
  
  // Payment management
  'payment:read:all',
  'payment:refund',
  
  // Return verification
  'return:verify',
  'return:approve',
  'return:dispute',
  
  // User support
  'user:read:all',
  'user:update:limited', // Phone, address, not role
  
  // Incidents
  'incident:create',
  'incident:read',
  'incident:update',
  'incident:assign',
  
  // Reports
  'report:booking',
  'report:revenue',
  'report:customer',
  
  // Communication
  'notification:send',
  'notification:read:all'
];
```

**Use Cases:**
- Handle customer support tickets
- Verify returns
- Process refunds
- Manage bookings on behalf of customers
- Resolve disputes
- Generate reports

**Restrictions:**
- Cannot modify system configuration
- Cannot change user roles
- Cannot access sensitive audit logs
- Cannot delete data

---

### Admin Role

**System administrators with full access.**

**Permissions:**
```typescript
const ADMIN_PERMISSIONS = [
  '*:*' // Full access to all resources
];
```

**Detailed Permissions:**
```typescript
const ADMIN_DETAILED_PERMISSIONS = [
  ...OPERATOR_PERMISSIONS, // Inherit operator permissions
  ...TECHNICIAN_PERMISSIONS, // Inherit technician permissions
  
  // User management
  'user:create',
  'user:delete',
  'user:update:role',
  
  // System configuration
  'config:read',
  'config:update',
  
  // Product management
  'product:create',
  'product:update',
  'product:delete',
  'category:manage',
  
  // Location management
  'location:create',
  'location:update',
  'location:delete',
  
  // Locker management
  'locker:create',
  'locker:delete',
  'locker:configure',
  
  // Content management
  'content:create',
  'content:update',
  'content:publish',
  'content:delete',
  
  // Audit & compliance
  'audit_log:read',
  'audit_log:export',
  
  // Advanced reports
  'report:*'
];
```

**Use Cases:**
- Full system administration
- User role management
- Configuration changes
- Data exports
- Security incident response

**Restrictions:**
- All actions logged in audit trail
- Sensitive actions require 2FA
- Role changes require another admin approval

---

## Permission Checking

### Backend Permission Check

```typescript
// Decorator for route protection
function RequirePermission(permission: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const request = args[0]; // Assuming first arg is request
      const user = request.user;
      
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }
      
      if (!hasPermission(user, permission)) {
        throw new ForbiddenError(`Missing permission: ${permission}`);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// Usage
class BookingController {
  @RequirePermission('booking:read:all')
  async getAllBookings(req: Request, res: Response) {
    const bookings = await bookingService.findAll();
    return res.json({ data: bookings });
  }
  
  @RequirePermission('booking:cancel')
  async cancelBooking(req: Request, res: Response) {
    const { id } = req.params;
    
    // Additional check: Own booking or admin/operator
    if (!req.user.isAdminOrOperator() && !await isOwnBooking(req.user.id, id)) {
      throw new ForbiddenError('Can only cancel own bookings');
    }
    
    const booking = await bookingService.cancel(id);
    return res.json({ data: booking });
  }
}
```

---

### Permission Checking Logic

```typescript
function hasPermission(user: User, permission: string): boolean {
  const rolePermissions = getRolePermissions(user.role);
  
  // Check for wildcard permission (admin)
  if (rolePermissions.includes('*:*')) {
    return true;
  }
  
  // Check exact match
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Check wildcard patterns
  const [resource, action] = permission.split(':');
  
  // Resource wildcard: user:*
  if (rolePermissions.includes(`${resource}:*`)) {
    return true;
  }
  
  // Action wildcard: *:read
  if (rolePermissions.includes(`*:${action}`)) {
    return true;
  }
  
  return false;
}
```

---

### Frontend Permission Gating

```tsx
// Hook for permission checking
function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return hasPermission(user, permission);
}

// Component-level gating
function CancelBookingButton({ booking }: { booking: Booking }) {
  const canCancel = usePermission('booking:cancel');
  const { user } = useAuth();
  
  // Customer can only cancel own bookings
  const isOwnBooking = booking.user_id === user.id;
  const canCancelThis = canCancel && (isOwnBooking || user.role !== 'customer');
  
  if (!canCancelThis) {
    return null; // Hide button
  }
  
  return (
    <Button onClick={() => cancelBooking(booking.id)}>
      Cancel Booking
    </Button>
  );
}

// Route-level gating
function AdminDashboard() {
  const canAccessAdmin = usePermission('admin:*');
  
  if (!canAccessAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
  return <div>Admin Dashboard Content</div>;
}
```

---

## Authentication

### JWT-Based Authentication

**Token Structure:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": "uuid",
    "email": "user@example.com",
    "role": "customer",
    "session_id": "uuid",
    "iat": 1703592000,
    "exp": 1703678400
  },
  "signature": "..."
}
```

**Token Lifecycle:**
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 30 days expiry
- **Session Token**: Stored in database

**Login Flow:**
```typescript
async function login(email: string, password: string) {
  // 1. Verify credentials
  const user = await getUserByEmail(email);
  if (!user || !await verifyPassword(password, user.password_hash)) {
    throw new InvalidCredentialsError();
  }
  
  // 2. Check account status
  if (!user.is_active) {
    throw new AccountSuspendedError();
  }
  
  if (!user.email_verified) {
    throw new EmailNotVerifiedError();
  }
  
  // 3. Create session
  const session = await createSession({
    user_id: user.id,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    expires_at: addDays(new Date(), 30)
  });
  
  // 4. Generate tokens
  const accessToken = jwt.sign(
    {
      user_id: user.id,
      email: user.email,
      role: user.role,
      session_id: session.id
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { session_id: session.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  
  // 5. Update last login
  await updateUser(user.id, {
    last_login_at: new Date()
  });
  
  // 6. Log authentication
  await auditLog({
    user_id: user.id,
    action: 'login',
    ip_address: req.ip
  });
  
  return {
    user,
    access_token: accessToken,
    refresh_token: refreshToken
  };
}
```

---

### Token Refresh Flow

```typescript
async function refreshAccessToken(refreshToken: string) {
  // 1. Verify refresh token
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new InvalidTokenError();
  }
  
  // 2. Check session exists and is valid
  const session = await getSession(payload.session_id);
  if (!session || session.expires_at < new Date()) {
    throw new SessionExpiredError();
  }
  
  // 3. Get user
  const user = await getUser(session.user_id);
  if (!user || !user.is_active) {
    throw new InvalidSessionError();
  }
  
  // 4. Generate new access token
  const accessToken = jwt.sign(
    {
      user_id: user.id,
      email: user.email,
      role: user.role,
      session_id: session.id
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // 5. Update session last used
  await updateSession(session.id, {
    last_used_at: new Date()
  });
  
  return { access_token: accessToken };
}
```

---

### Password Security

**Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Hashing:**
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

**Password Reset Flow:**
```typescript
async function requestPasswordReset(email: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    // Don't reveal if email exists
    return { message: 'If email exists, reset link sent' };
  }
  
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Store token (expires in 1 hour)
  await storePasswordResetToken({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: addHours(new Date(), 1)
  });
  
  // Send email
  await sendEmail({
    to: user.email,
    template: 'password_reset',
    data: {
      reset_url: `${APP_URL}/auth/reset-password?token=${token}`
    }
  });
  
  return { message: 'If email exists, reset link sent' };
}

async function resetPassword(token: string, newPassword: string) {
  // Hash token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Find valid token
  const resetToken = await getPasswordResetToken(tokenHash);
  if (!resetToken || resetToken.expires_at < new Date()) {
    throw new InvalidTokenError('Invalid or expired reset token');
  }
  
  // Validate new password
  validatePasswordStrength(newPassword);
  
  // Update password
  const passwordHash = await hashPassword(newPassword);
  await updateUser(resetToken.user_id, { password_hash: passwordHash });
  
  // Invalidate all sessions
  await invalidateAllSessions(resetToken.user_id);
  
  // Delete reset token
  await deletePasswordResetToken(resetToken.id);
  
  // Log password change
  await auditLog({
    user_id: resetToken.user_id,
    action: 'password_reset'
  });
}
```

---

## Digital Signing

### Signature Types

#### 1. Typed Signature (Default)
**Lowest security, highest convenience.**

```typescript
interface TypedSignature {
  type: 'typed';
  value: string; // User types their name
  ip_address: string;
  user_agent: string;
  timestamp: Date;
}

async function signWithTyped(bookingId: string, typedName: string) {
  const booking = await getBooking(bookingId);
  const user = await getUser(booking.user_id);
  
  // Validate typed name matches user
  const normalizedName = `${user.first_name} ${user.last_name}`.toLowerCase();
  if (typedName.toLowerCase() !== normalizedName) {
    throw new Error('Name must match your account name');
  }
  
  // Generate content hash
  const content = generateAgreementContent(booking);
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');
  
  // Create agreement
  return await createRentalAgreement({
    booking_id: bookingId,
    user_id: user.id,
    signature_type: 'typed',
    signature_value: typedName,
    terms_html: content,
    terms_version: CURRENT_TERMS_VERSION,
    content_hash: contentHash,
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  });
}
```

---

#### 2. Smart-ID (Estonia)
**High security, strong authentication.**

```typescript
interface SmartIdSignature {
  type: 'smart_id';
  session_id: string;
  verification_code: string;
  signature_value: string; // Cryptographic signature
  certificate: string; // User's certificate
  national_id: string; // Estonian personal code
}

async function initiateSmartIdSigning(bookingId: string, nationalId: string) {
  const booking = await getBooking(bookingId);
  
  // Generate content hash
  const content = generateAgreementContent(booking);
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');
  
  // Initiate Smart-ID session
  const session = await smartIdClient.signature.init({
    nationalIdentityNumber: nationalId,
    hash: contentHash,
    hashType: 'SHA256',
    displayText: `Rental Agreement: ${booking.booking_number}`
  });
  
  // Store pending signature
  await createPendingSignature({
    booking_id: bookingId,
    session_id: session.sessionId,
    verification_code: session.verificationCode,
    expires_at: addMinutes(new Date(), 5)
  });
  
  return {
    session_id: session.sessionId,
    verification_code: session.verificationCode,
    status: 'pending'
  };
}

async function pollSmartIdStatus(sessionId: string) {
  const pending = await getPendingSignature(sessionId);
  if (!pending) {
    throw new Error('Signature session not found');
  }
  
  // Poll Smart-ID for status
  const result = await smartIdClient.signature.status(sessionId);
  
  if (result.state === 'COMPLETE') {
    // Verify signature
    const isValid = await verifySmartIdSignature(
      result.signature,
      result.certificate,
      pending.content_hash
    );
    
    if (!isValid) {
      throw new Error('Signature verification failed');
    }
    
    // Create rental agreement
    const agreement = await createRentalAgreement({
      booking_id: pending.booking_id,
      user_id: pending.user_id,
      signature_type: 'smart_id',
      signature_value: result.signature,
      signature_metadata: {
        certificate: result.certificate,
        national_id: result.nationalId,
        session_id: sessionId
      },
      terms_html: pending.terms_html,
      terms_version: CURRENT_TERMS_VERSION,
      content_hash: pending.content_hash,
      ip_address: pending.ip_address,
      user_agent: pending.user_agent
    });
    
    // Delete pending signature
    await deletePendingSignature(sessionId);
    
    return { status: 'completed', agreement };
  }
  
  return { status: result.state.toLowerCase() };
}
```

---

#### 3. Mobile-ID (Estonia)
**Similar to Smart-ID but uses SIM card.**

```typescript
async function initiateMobileIdSigning(bookingId: string, phoneNumber: string) {
  // Similar flow to Smart-ID
  // Uses mobile phone SIM card for authentication
  // Implementation details specific to Mobile-ID provider
}
```

---

#### 4. ID-Card (Estonia)
**Highest security, requires card reader.**

```typescript
async function signWithIdCard(bookingId: string, certificateHash: string) {
  // Browser-based signature using Web eID
  // User must have card reader
  // Certificate verified against Estonian trust service
}
```

---

### Signature Requirements Matrix

```typescript
function getRequiredSignatureType(booking: Booking, user: User): SignatureType | 'any' {
  // High-value rentals require strong auth
  if (booking.total_due > 50000) { // >500 EUR
    return 'smart_id'; // or mobile_id, id_card
  }
  
  // Long-term rentals require strong auth
  if (booking.duration_days > 7) {
    return 'smart_id';
  }
  
  // Business customers require strong auth
  if (user.is_business) {
    return 'id_card';
  }
  
  // First-time customers (high-value)
  if (user.successful_rentals === 0 && booking.total_due > 20000) {
    return 'smart_id';
  }
  
  // Default: any signature type accepted
  return 'any';
}
```

---

## Security Best Practices

### 1. Input Validation

```typescript
import { z } from 'zod';

const bookingSchema = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime()
}).refine(data => new Date(data.end_at) > new Date(data.start_at), {
  message: 'End time must be after start time',
  path: ['end_at']
});

// Validate all user input
function createBooking(req: Request, res: Response) {
  const validation = bookingSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: validation.error.flatten()
      }
    });
  }
  
  // Proceed with validated data
  const data = validation.data;
}
```

---

### 2. SQL Injection Prevention

```typescript
// ❌ BAD: Direct string concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD: Parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [email]);

// ✅ GOOD: ORM (Prisma)
const user = await prisma.user.findUnique({
  where: { email }
});
```

---

### 3. XSS Prevention

```typescript
// Backend: Sanitize HTML input
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  });
}

// Frontend: Use React's built-in escaping
function ProductDescription({ html }: { html: string }) {
  // React escapes by default
  return <div>{html}</div>;
  
  // If need to render HTML:
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}
```

---

### 4. CSRF Protection

```typescript
// Use double-submit cookie pattern
app.use(csrfProtection());

// Or use SameSite cookies
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

---

### 5. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Strict limit for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true // Only count failed attempts
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
```

---

### 6. Secure Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'https://cdn.rentbox.ee'],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Audit Logging

### What to Log

```typescript
interface AuditLog {
  user_id: string | null;
  resource_type: string;
  resource_id: string;
  action: string;
  changes: Record<string, { old: any; new: any }>;
  metadata: Record<string, any>;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
}

// Log all sensitive actions
async function auditLog(entry: Omit<AuditLog, 'timestamp'>) {
  await db.audit_logs.create({
    data: {
      ...entry,
      timestamp: new Date()
    }
  });
}

// Example usage
await auditLog({
  user_id: user.id,
  resource_type: 'booking',
  resource_id: booking.id,
  action: 'cancelled',
  changes: {
    status: { old: 'active', new: 'cancelled' }
  },
  metadata: {
    refund_amount: 12000,
    reason: 'customer_request'
  },
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
});
```

---

## Threat Mitigation

### Threat: Account Takeover

**Mitigations:**
1. Strong password requirements
2. Rate limiting on login
3. Account lockout after 5 failed attempts
4. Email notification on new login
5. Session management (invalidate all sessions on password change)

---

### Threat: Double Booking

**Mitigations:**
1. Database exclusion constraint
2. Serializable transaction isolation
3. Optimistic locking
4. Idempotency keys
5. Thorough testing

---

### Threat: Payment Fraud

**Mitigations:**
1. Payment provider fraud detection
2. 3D Secure for cards
3. Velocity checks (max bookings per hour)
4. Unusual pattern detection
5. Manual review for high-value first bookings

---

### Threat: Tool Theft

**Mitigations:**
1. Payment before access
2. Deposit held until return
3. National ID verification for high-value
4. Photo documentation
5. GPS tracking (future feature)

---

## Summary

**Security model ensures:**
1. ✅ Least-privilege access control
2. ✅ Strong authentication
3. ✅ Legally binding signatures
4. ✅ Comprehensive audit trail
5. ✅ Protection against common threats
6. ✅ Compliance with GDPR

**Key principles:**
- Trust but verify
- Defense in depth
- Fail securely
- Log everything
- Never trust client input
