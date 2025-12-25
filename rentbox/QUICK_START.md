# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Stripe account (test mode is fine)

### Step 1: Database Setup (2 min)

```bash
# Create database
createdb rentbox

# Navigate to backend
cd rentbox/backend

# Copy environment file
cp .env.example .env

# Edit .env - set your DATABASE_URL
# DATABASE_URL=postgresql://your_user:your_password@localhost:5432/rentbox

# Install dependencies
npm install

# Run migrations
npm run migrate

# Seed sample data (5 products, 3 lockers, pricing rules)
npm run seed
```

### Step 2: Start Backend (1 min)

```bash
# Still in backend directory
npm run dev

# Server starts on http://localhost:3000
# You should see: 🚀 Rentbox API server running on port 3000
```

### Step 3: Start Frontend (1 min)

Open a new terminal:

```bash
cd rentbox/frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Frontend starts on http://localhost:5173
```

### Step 4: Test It! (1 min)

#### Test with cURL:

```bash
# Create a cart
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user", "session_id": "test_session"}'

# Response will include cart_id - use it below
CART_ID="<paste-cart-id-here>"

# Add item to cart (use product_id from seed data)
curl -X POST http://localhost:3000/api/cart/$CART_ID/items \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "<get-from-database>",
    "start_at": "2024-12-26T09:00:00Z",
    "end_at": "2024-12-28T18:00:00Z"
  }'

# Get cart with items
curl http://localhost:3000/api/cart/$CART_ID
```

#### Test in Browser:

1. Open http://localhost:5173/admin
2. You'll see the Admin Dashboard with stats
3. Open DevTools Console
4. Run this to create a test cart:

```javascript
fetch('http://localhost:3000/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'test', session_id: 'abc' })
}).then(r => r.json()).then(console.log)
```

## 🗄️ Get Product IDs from Database

```bash
psql rentbox -c "SELECT id, name FROM products LIMIT 5;"
```

Copy a product ID and use it in the "Add to cart" request above.

## 🧪 Test Stripe Integration

For Stripe testing, you need to:

1. Get test keys from https://dashboard.stripe.com/test/apikeys
2. Add to `backend/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLIC_KEY=pk_test_...
   ```
3. Add to `frontend/.env`:
   ```env
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   ```
4. Restart both servers
5. Use Stripe's test card: `4242 4242 4242 4242`

## 📊 View Sample Data

```bash
# Connect to database
psql rentbox

# View products
SELECT id, name, base_price_daily FROM products;

# View compartments
SELECT locker_id, compartment_number, size FROM compartments;

# View pricing rules
SELECT name, rule_type, multiplier, discount_percentage FROM pricing_rules;
```

## 🔍 Check System Health

```bash
# Backend health check
curl http://localhost:3000/health

# Should return: {"status":"healthy","database":"connected"}

# Get admin stats
curl http://localhost:3000/api/admin/stats
```

## 📝 Common Issues

### Database Connection Failed
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check credentials: `psql $DATABASE_URL`

### Port Already in Use
- Backend (3000): Change PORT in `.env`
- Frontend (5173): Change in `vite.config.ts`

### TypeScript Errors
- Run `npm install` in both directories
- Clear and rebuild: `rm -rf node_modules dist && npm install && npm run build`

## 🎯 Next Steps

1. **Read the docs:**
   - `README.md` - Full documentation
   - `EXAMPLES.md` - API examples
   - `DEPLOYMENT.md` - Production deployment

2. **Explore the code:**
   - Backend services: `backend/src/services/`
   - Frontend components: `frontend/src/components/`
   - Database schema: `backend/src/db/schema.sql`

3. **Test the flows:**
   - Create cart → Add items → Checkout
   - Admin dashboard
   - Booking extension
   - Cart expiry

4. **Customize:**
   - Add your own products
   - Adjust pricing rules
   - Configure cart TTL
   - Brand the UI

## 🎉 You're All Set!

The system is now running locally. Here's what you can do:

- ✅ Create carts and add items
- ✅ Check availability in real-time
- ✅ See dynamic pricing calculations
- ✅ View admin dashboard
- ✅ Test complete booking flows

For production deployment, see `DEPLOYMENT.md`.

Happy coding! 🚀
