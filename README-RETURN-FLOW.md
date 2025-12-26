# Rentbox.ee Return Flow

A comprehensive return flow system for Rentbox.ee rentals that makes returns traceable, reduces disputes, and supports 24/7 self-service.

## Features

- ✅ Return confirmation button
- ✅ Photo upload (optional, max 3 photos)
- ✅ Auto-detect overdue returns
- ✅ Admin confirmation view
- ✅ Return reminder emails
- ✅ Dispute tracking

## Flow

1. **Booking reaches end_at** - System checks for bookings that have ended
2. **User receives return reminder** - Email sent automatically via cron job
3. **User clicks "I returned the tool"** - Frontend component triggers return request
4. **Optional: upload return photos** - Up to 3 photos can be uploaded
5. **System verifies timing and status** - Automatically marks overdue returns

## API Endpoints

### POST `/api/bookings/:id/return`
Submit a return request for a booking.

**Request:**
- `FormData` with optional `photos` field (File[])

**Response:**
```json
{
  "booking": { ... },
  "overdue": false,
  "message": "Return request submitted successfully..."
}
```

### GET `/api/admin/returns`
Get all return requests (admin only).

**Query Parameters:**
- `status` - Filter by return_status (pending, confirmed, approved, disputed)
- `overdue` - Filter overdue returns only (true/false)

**Response:**
```json
{
  "returns": [
    {
      "booking_id": "...",
      "user_id": "...",
      "tool_id": "...",
      "tool_name": "...",
      "user_email": "...",
      "end_at": "...",
      "return_requested_at": "...",
      "return_status": "pending",
      "return_photos": ["url1", "url2"],
      "overdue": false,
      "days_overdue": 0,
      "admin_notes": "..."
    }
  ]
}
```

### PATCH `/api/admin/returns`
Approve or dispute a return (admin only).

**Request Body:**
```json
{
  "booking_id": "...",
  "action": "approved" | "disputed",
  "admin_notes": "Optional notes"
}
```

## Database Schema

See `database/schema.sql` for the complete schema. Key tables:

- `bookings` - Stores booking and return information
- `tools` - Tool catalog
- `users` - User information
- `return_reminders` - Log of sent reminders

## Setup

1. **Create D1 Database:**
```bash
wrangler d1 create rentbox-db
```

2. **Run migrations:**
```bash
wrangler d1 execute rentbox-db --file=./database/schema.sql
```

3. **Create R2 Bucket for photos:**
```bash
wrangler r2 bucket create rentbox-return-photos
```

4. **Configure wrangler.toml:**
Copy `wrangler.toml.example` to `wrangler.toml` and update with your database/bucket IDs.

5. **Set up Cron Trigger:**
The cron trigger runs hourly to send return reminders. Configure in `wrangler.toml`:
```toml
[[triggers.crons]]
cron = "0 * * * *"
route = "/api/cron/return-reminders"
```

## Components

### ReturnFlow
User-facing component for submitting returns.

**Props:**
- `bookingId` - Booking ID
- `endAt` - End date/time (ISO string)
- `onReturnSubmitted` - Callback after successful submission

**Usage:**
```tsx
<ReturnFlow 
  bookingId="booking-123"
  endAt="2024-01-15T10:00:00Z"
  onReturnSubmitted={() => console.log("Returned!")}
/>
```

### AdminReturnsView
Admin interface for reviewing and approving returns.

**Props:**
- `authToken` - Admin authentication token

**Usage:**
```tsx
<AdminReturnsView authToken="your-admin-token" />
```

## Rules

- **Late returns** are automatically marked as overdue
- **Photos** are stored in R2 bucket with path: `returns/{booking_id}/{timestamp}-{filename}`
- **Admin** can approve or flag issues with notes
- **Return status** flow: `pending` → `confirmed` → `approved` or `disputed`

## Security

- Admin endpoints require Bearer token authentication
- Photo uploads are validated (type and count)
- Database queries use parameterized statements
- R2 bucket access is scoped to return photos only

## Email Integration

The return reminder system uses an optional `EMAIL_SERVICE` worker binding. To integrate:

1. Create an email service worker
2. Configure the binding in `wrangler.toml`
3. The service should accept POST requests with:
   - `to` - Recipient email
   - `subject` - Email subject
   - `template` - Template name
   - `data` - Template data

## Testing

Test the return flow:

1. Create a test booking with `end_at` in the past
2. Navigate to `/bookings/{booking_id}/return`
3. Upload photos (optional)
4. Click "I Returned the Tool"
5. Verify in admin view at `/admin/returns`

## Future Enhancements

- SMS reminders in addition to email
- Automatic status updates based on return photos (AI analysis)
- Return receipt generation
- Integration with payment system for late fees
- Mobile app support
