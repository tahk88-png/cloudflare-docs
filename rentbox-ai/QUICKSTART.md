# Rentbox AI Employee - Quick Start Guide

This guide will get you up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 13+ installed and running
- OpenAI API key

## Quick Setup

### 1. Install Dependencies (1 minute)

```bash
cd /workspace/rentbox-ai
npm install
```

### 2. Configure Environment (2 minutes)

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql://localhost:5432/rentbox_ai
OPENAI_API_KEY=sk-your-key-here
```

For quick testing, you can skip email/SMS configuration - the system will use mock providers.

### 3. Setup Database (1 minute)

```bash
# Create database
createdb rentbox_ai

# Run migrations and seed data
npm run db:migrate
npm run db:seed
```

### 4. Start the Application (1 minute)

Open two terminals:

**Terminal 1 - Web Server:**
```bash
npm run dev
```

**Terminal 2 - Background Worker:**
```bash
npm run worker
```

## Access the Application

- **Homepage**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Chat with Context**: http://localhost:3000?booking_id=1&user_id=1

## Test the System

### Test the Chat Widget

1. Open http://localhost:3000?booking_id=1&user_id=1
2. Click the chat button in the bottom right
3. Try these messages:
   - "What's my booking status?"
   - "Can you help me open the locker?"
   - "When do I need to return this?"

### Test the Admin Dashboard

1. Open http://localhost:3000/admin
2. View risk dashboard metrics
3. Browse tickets at http://localhost:3000/admin/tickets
4. Check AI actions at http://localhost:3000/admin/ai-actions

### Test Event Webhooks

Send a test event:

```bash
curl -X POST http://localhost:3000/api/events/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "locker.open_failed",
    "entity_type": "booking",
    "entity_id": 3,
    "payload": {
      "booking_id": 3,
      "compartment_number": "T6",
      "error": "door_jammed",
      "attempt_count": 2
    }
  }'
```

Wait 1 minute for the worker to process, then check:
- Admin dashboard for new ticket
- AI actions log for automation activity

## Sample Data

The seed data includes:
- 4 sample users
- 5 products (scooter, tent, drill, camera, bicycle)
- 3 locker locations (Tallinn, Tartu, Pärnu)
- 30 compartments
- 4 bookings (various statuses)
- Automation rules configured
- Message templates ready

**Test Booking IDs:**
- Booking #1: Active rental (john.doe@example.com)
- Booking #2: Confirmed, upcoming (jane.smith@example.com)
- Booking #3: Overdue with locker issue (alice.johnson@example.com)
- Booking #4: Pending payment (bob.wilson@example.com)

## Common Issues

### Database connection failed
```bash
# Check PostgreSQL is running
pg_isready

# Create database if needed
createdb rentbox_ai
```

### OpenAI API errors
- Make sure your API key is valid
- Check you have credits in your OpenAI account
- The system uses GPT-4 Turbo which requires appropriate access

### Worker not processing events
- Make sure the worker is running in a separate terminal
- Check worker logs for errors
- Verify database connection in worker

## Next Steps

1. **Customize Agents**: Edit `lib/ai/agents.ts` to adjust agent prompts
2. **Add Automation Rules**: Insert new rules in `automation_rules` table
3. **Configure Templates**: Modify message templates in database
4. **Add Authentication**: Implement auth middleware for admin routes
5. **Setup Production**: Follow deployment guide in README.md

## Development Tips

- Hot reload works for Next.js app
- Restart worker after changing automation code
- Use `npm run db:reset` to reset database to seed state
- Check `ai_actions` table to debug AI behavior
- Monitor `events` table to see webhook processing

## Getting Help

- Check README.md for full documentation
- Review database schema in `database/schema.sql`
- Inspect API endpoints in `app/api/`
- Look at agent prompts in `lib/ai/agents.ts`

---

**You're all set! Start chatting with the AI employee at http://localhost:3000** 🚀
