# Rentbox AI Employee v1.0

This is a self-contained Next.js (App Router) app that implements:

- Customer support chat widget (embeddable)
- Event-driven + scheduled automation (worker/cron)
- Admin console (risk dashboard, tickets, AI actions log)

## Embed the chat widget on rentbox.ee

Include:

```html
<script
  src="https://YOUR-DEPLOYMENT.example/widget.js"
  data-booking-id="seed-booking-1"
></script>
```

The widget also reads `booking_id` from the page URL query string if `data-booking-id` is omitted.

## Local setup

1) Install dependencies:

```bash
cd apps/rentbox-ai-employee
npm install
```

2) Configure environment:

```bash
cp .env.example .env.local
```

3) Run migrations + seed:

```bash
npm run db:migrate
npm run db:seed
```

4) Start the web app:

```bash
npm run dev
```

5) (Optional) Start the worker:

```bash
npm run worker
```

## API surface (v1)

- **Chat**
  - `GET /api/chat/messages?booking_id=...`
  - `POST /api/chat/messages` `{ booking_id, content }` (stores message + routes to support/ops/sales)
- **Events**
  - `POST /api/events` `{ type, source?, external_id?, booking_id?, payload }` (stores to `events`, processes rules, logs `ai_actions`)
- **Admin**
  - `POST /api/admin/login` `{ key }` (sets `rb_admin` cookie)
  - `GET /api/admin/risk`
  - `GET /api/admin/tickets?status=open|in_progress|resolved|closed`
  - `GET /api/admin/ai-actions?q=...`

