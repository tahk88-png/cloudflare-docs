## Rentbox.ee — Booking Cart & Checkout (reference implementation)

This folder contains a **complete, ready-to-run** reference implementation of a **time-based booking cart** (not quantity e-commerce) with:

- **Soft locks** (`cart_locks`) to prevent overselling while users are in cart
- **Overlap-proof bookings** (`bookings`) enforced by Postgres exclusion constraints
- **TTL carts** (15 minutes, sliding on activity) + automatic lock expiry
- **Idempotent checkout** + Stripe webhooks + admin recovery tools
- **Dynamic pricing engine** with detailed breakdowns
- **Extend rental** flow with same-compartment availability check

### Quick start (local)

1) Start Postgres

```bash
docker compose -f rentbox/docker-compose.yml up -d
```

2) Backend

```bash
cd rentbox/backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Backend runs on `http://localhost:8787`.

3) Frontend

```bash
cd rentbox/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### API overview

- **Cart**
  - `POST /api/cart`
  - `GET /api/cart/:id`
  - `POST /api/cart/:id/items`
  - `PUT /api/cart/:id/items/:item_id`
  - `DELETE /api/cart/:id/items/:item_id`
  - `POST /api/cart/:id/validate`
- **Checkout**
  - `POST /api/cart/:id/checkout`
  - `POST /api/cart/:id/confirm-payment`
- **Payments**
  - `POST /api/payments/webhook`
- **Extend**
  - `POST /api/bookings/:id/extend`
- **Admin**
  - `GET /api/admin/carts`
  - `GET /api/admin/bookings`
  - `POST /api/admin/carts/:id/recover`
  - `POST /api/admin/bookings/:id/force-release`

### Examples

See:

- `rentbox/backend/examples/cart.create.json`
- `rentbox/backend/examples/cart.add-item.json`
- `rentbox/backend/examples/cart.validate.response.json`

