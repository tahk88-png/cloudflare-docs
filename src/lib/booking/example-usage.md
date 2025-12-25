# Example Usage

## Complete Flow Example

### 1. Create Cart

```typescript
const response = await fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-123', // Optional for guest carts
  }),
});

const { cart } = await response.json();
console.log('Cart created:', cart.id);
```

### 2. Add Item to Cart

```typescript
const itemResponse = await fetch(`/api/cart/${cart.id}/items`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: '550e8400-e29b-41d4-a716-446655440000',
    start_at: '2024-01-15T10:00:00Z',
    end_at: '2024-01-15T14:00:00Z',
  }),
});

const { item } = await itemResponse.json();
console.log('Item added:', item.id);
```

### 3. Validate Cart

```typescript
const validateResponse = await fetch(`/api/cart/${cart.id}/validate`, {
  method: 'POST',
});

const { validation } = await validateResponse.json();

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
} else {
  console.log('Cart is valid');
}
```

### 4. Checkout

```typescript
const checkoutResponse = await fetch(`/api/cart/${cart.id}/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user-123',
    return_url: 'https://rentbox.ee/booking/success',
  }),
});

const { checkout } = await checkoutResponse.json();
console.log('Payment Intent:', checkout.payment_intent_id);

// Redirect to Stripe Checkout or use Stripe Elements
// After payment, webhook will automatically create bookings
```

### 5. Extend Rental

```typescript
const extendResponse = await fetch(`/api/bookings/${bookingId}/extend`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    new_end_at: '2024-01-15T18:00:00Z',
  }),
});

const { success, additional_cost } = await extendResponse.json();

if (success) {
  console.log('Rental extended. Additional cost:', additional_cost);
}
```

## React Component Usage

### Cart Page

```tsx
import { CartView } from '~/components/booking/CartView';

function CartPage() {
  const cartId = useSearchParams().get('cart_id');
  
  return (
    <CartView 
      cartId={cartId} 
      onCheckout={() => {
        window.location.href = `/checkout?cart_id=${cartId}`;
      }} 
    />
  );
}
```

### Checkout Page

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CheckoutFlow } from '~/components/booking/CheckoutFlow';

const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY!);

function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState(null);
  const cartId = useSearchParams().get('cart_id');
  
  useEffect(() => {
    // Load checkout data
    fetch(`/api/cart/${cartId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: getCurrentUserId(),
        return_url: `${window.location.origin}/booking/success`,
      }),
    })
      .then(res => res.json())
      .then(data => setCheckoutData(data.checkout));
  }, [cartId]);
  
  if (!checkoutData) return <div>Loading...</div>;
  
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.client_secret }}>
      <CheckoutFlow
        cartId={cartId}
        userId={getCurrentUserId()}
        checkoutData={checkoutData}
        onSuccess={(bookings) => {
          window.location.href = `/booking/success?bookings=${bookings.map(b => b.id).join(',')}`;
        }}
        onError={(error) => {
          alert(`Payment failed: ${error}`);
        }}
      />
    </Elements>
  );
}
```

## JSON Examples

### Cart Response

```json
{
  "success": true,
  "cart": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "status": "active",
    "expires_at": "2024-01-15T10:15:00Z",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "items": [
    {
      "id": "item-123",
      "product_id": "product-123",
      "start_at": "2024-01-15T10:00:00Z",
      "end_at": "2024-01-15T14:00:00Z",
      "price": 2000,
      "deposit": 10000
    }
  ],
  "locks": [
    {
      "id": "lock-123",
      "product_id": "product-123",
      "compartment_id": "comp-123",
      "start_at": "2024-01-15T10:00:00Z",
      "end_at": "2024-01-15T14:00:00Z",
      "expires_at": "2024-01-15T10:15:00Z"
    }
  ]
}
```

### Validation Response

```json
{
  "success": true,
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [
      {
        "item_id": "item-123",
        "product_id": "product-123",
        "warning": "Only one compartment remaining"
      }
    ]
  }
}
```

### Checkout Response

```json
{
  "success": true,
  "checkout": {
    "checkout_id": "cart-123",
    "payment_intent_id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_...",
    "redirect_url": "https://rentbox.ee/booking/success",
    "total_amount": 12000,
    "currency": "EUR"
  }
}
```

### Extend Rental Response

```json
{
  "success": true,
  "booking_id": "booking-123",
  "original_end_at": "2024-01-15T14:00:00Z",
  "new_end_at": "2024-01-15T18:00:00Z",
  "additional_cost": 2000,
  "payment_intent_id": null
}
```
