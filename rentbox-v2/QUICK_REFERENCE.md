# Rentbox v2 Quick Reference

## Database Queries

### Check Booking Conflicts
```sql
SELECT * FROM bookings
WHERE compartment_id = 'uuid'
  AND status IN ('paid', 'active')
  AND tsrange(start_at, end_at) && tsrange('2024-01-15 10:00:00+02'::timestamptz, '2024-01-15 18:00:00+02'::timestamptz);
```

### Find Overdue Bookings
```sql
SELECT * FROM bookings
WHERE status = 'active'
  AND end_at < NOW();
```

### Get Active Bookings for User
```sql
SELECT b.*, p.name as product_name, c.number as compartment_number
FROM bookings b
JOIN products p ON b.product_id = p.id
JOIN compartments c ON b.compartment_id = c.id
WHERE b.user_id = 'uuid'
  AND b.status IN ('active', 'paid')
ORDER BY b.start_at ASC;
```

### Access Event Audit Trail
```sql
SELECT ae.*, b.user_id, c.number as compartment_number
FROM access_events ae
LEFT JOIN bookings b ON ae.booking_id = b.id
JOIN compartments c ON ae.compartment_id = c.id
WHERE ae.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY ae.timestamp DESC;
```

## Redis Commands

### Check Pending Booking TTL
```bash
redis-cli TTL booking:pending:uuid
```

### Acquire Lock Manually
```bash
redis-cli SET booking:lock:compartment:start:end "lock-value" EX 30 NX
```

### Release Lock
```bash
redis-cli DEL booking:lock:compartment:start:end
```

## API Quick Tests

### Create Booking (cURL)
```bash
curl -X POST http://localhost:3001/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "uuid",
    "compartment_id": "uuid",
    "start_at": "2024-01-15T10:00:00+02:00",
    "end_at": "2024-01-15T18:00:00+02:00"
  }'
```

### Check Availability
```bash
curl -X POST http://localhost:3001/api/bookings/availability \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "compartment_id": "uuid",
    "start_at": "2024-01-15T10:00:00+02:00",
    "end_at": "2024-01-15T18:00:00+02:00"
  }'
```

### Open Compartment
```bash
curl -X POST http://localhost:3001/api/lockers/LOCKER_ID/compartments/COMPARTMENT_ID/open \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Variables Checklist

### Backend (.env)
```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/rentbox_v2
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars

# Optional but recommended
FRONTEND_URL=http://localhost:3000
MQTT_BROKER_URL=mqtt://localhost:1883
STRIPE_SECRET_KEY=sk_test_...
TWILIO_ACCOUNT_SID=...
RESEND_API_KEY=re_...
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

## Common Issues & Solutions

### Issue: "Booking overlaps with existing active booking"
**Solution:** The database constraint is working. Check for existing bookings:
```sql
SELECT * FROM bookings 
WHERE compartment_id = 'your-compartment-id' 
  AND status IN ('paid', 'active');
```

### Issue: "Failed to acquire lock"
**Solution:** Another process is creating a booking. Wait a few seconds and retry.

### Issue: MQTT connection failed
**Solution:** 
1. Check MQTT broker is running
2. Verify `MQTT_BROKER_URL` in .env
3. Check network connectivity
4. Review MQTT logs

### Issue: Prisma client not generated
**Solution:**
```bash
cd backend
npm run prisma:generate
```

## Status Codes Reference

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Booking conflict
- `500 Internal Server Error` - Server error

## Booking Status Flow

```
pending (15min TTL)
  ↓ [payment succeeds]
paid
  ↓ [start_at reached]
active
  ↓ [end_at reached OR return confirmed]
completed

Alternative paths:
pending → cancelled (user cancels OR TTL expires)
paid → cancelled (before start_at)
active → overdue (end_at passed, no return)
```

## Time Zone Handling

**All times stored in UTC** (`TIMESTAMPTZ`)

**Display in Europe/Tallinn:**
```typescript
import { format } from 'date-fns';
import { et } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const tallinnTime = toZonedTime(utcDate, 'Europe/Tallinn');
format(tallinnTime, 'PPp', { locale: et });
```

## Testing Checklist

- [ ] Create booking with valid times
- [ ] Try to create overlapping booking (should fail)
- [ ] Extend booking
- [ ] Cancel pending booking
- [ ] Check availability
- [ ] Open compartment (if MQTT configured)
- [ ] View dashboard

## Monitoring Queries

### Bookings by Status
```sql
SELECT status, COUNT(*) 
FROM bookings 
GROUP BY status;
```

### Average Booking Duration
```sql
SELECT AVG(EXTRACT(EPOCH FROM (end_at - start_at))/3600) as avg_hours
FROM bookings
WHERE status = 'completed';
```

### Access Success Rate
```sql
SELECT 
  result,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM access_events
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY result;
```

### Most Used Compartments
```sql
SELECT 
  c.number,
  COUNT(b.id) as booking_count
FROM compartments c
LEFT JOIN bookings b ON c.id = b.compartment_id
WHERE b.created_at > NOW() - INTERVAL '30 days'
GROUP BY c.id, c.number
ORDER BY booking_count DESC
LIMIT 10;
```

---

**Quick Reference v1.0**
