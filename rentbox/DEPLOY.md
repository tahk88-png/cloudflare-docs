# Deployment Procedures

## 1. System Components

The Rentbox system consists of three distinct processes that must run simultaneously:

1.  **Web Application (Next.js)**
    *   Handles HTTP traffic (Dashboard, Chat API, Webhooks).
    *   Port: 3000 (default)
2.  **Worker Process (Node/Cron)**
    *   Runs scheduled tasks (Risk Engine, Notifications, Maintenance Watchdog).
    *   Command: `npm run worker`
    *   **Critical**: Must be a singleton (only one instance running) to avoid double-processing events.
3.  **Database (PostgreSQL)**
    *   Primary persistent store.

## 2. Environment Variables

Strictly required for production operation.

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/rentbox?schema=public&sslmode=prefer"

# Security
RENTBOX_HMAC_SECRET="<generate_random_64_char_hex>"
GATEWAY_TOKEN="<generate_secure_token_for_outgoing_requests>"

# External Gateway
GATEWAY_URL="https://gateway.rentbox.ee/v1"

# AI & Notifications (Mocked for now, but required slots)
OPENAI_API_KEY="sk-..."
EMAIL_PROVIDER_KEY="..."
SMS_PROVIDER_KEY="..."
```

## 3. Deployment Steps

### A. Database Migration
Run this *before* starting new application versions.
```bash
npx prisma migrate deploy
```

### B. Build Application
```bash
npm install
npm run build
```

### C. Process Management (PM2 Example)
Use a process manager to ensure resilience.

`ecosystem.config.js`:
```javascript
module.exports = {
  apps : [
    {
      name: "rentbox-web",
      script: "npm",
      args: "start",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "rentbox-worker",
      script: "npm",
      args: "run worker",
      instances: 1, // MUST BE 1
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
```

## 4. Health Checks

*   **Web**: `GET /api/health` (To be implemented, currently implied by 200 OK on root)
*   **Worker**: Monitoring logs for "Rentbox AI Worker V2 Started..." and periodic activity.

## 5. Rollback Plan

1.  **Database**: If `prisma migrate deploy` fails, assess potential data lock. Reverting schema changes manually may be required if destructive.
2.  **Application**: Revert to previous Docker tag or git commit.
3.  **Gateway**: The system is designed to handle Gateway downtime gracefully (queues tickets).
