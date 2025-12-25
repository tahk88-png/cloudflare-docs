// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT & PAYMENT SERVICE
// Handles checkout flow, payment intents, and booking creation
// ═══════════════════════════════════════════════════════════════════════════

import Stripe from 'stripe';
import { addMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, queryMany, withTransaction, txQueryOne, txQueryMany } from '../db/index.js';
import { 
  validateCart, 
  lockCartForCheckout, 
  unlockCart, 
  completeCart 
} from './cart.js';
import { 
  acquireCheckoutLocks, 
  createBookingsFromLocks,
  releaseCartLocks 
} from './availability.js';
import type {
  Cart,
  CartItem,
  Payment,
  Booking,
  Product,
  Compartment,
  Locker,
  CheckoutRequest,
  CheckoutResponse,
  PaymentConfirmationResponse,
  BookingResponse,
} from '../types/index.js';
import { ValidationError, ConflictError, NotFoundError, AppError } from '../types/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia',
});

const CHECKOUT_LOCK_DURATION_MINUTES = 30; // Payment must complete within 30 minutes

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT FLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initiate checkout process
 * 1. Validate cart
 * 2. Lock cart
 * 3. Acquire checkout locks
 * 4. Create payment intent
 */
export async function initiateCheckout(
  cartId: string,
  data: CheckoutRequest
): Promise<CheckoutResponse> {
  // Step 1: Validate cart
  const validation = await validateCart(cartId);
  
  if (!validation.valid) {
    throw new ValidationError('Cart validation failed', { errors: validation.errors });
  }
  
  // Step 2: Lock cart for checkout
  await lockCartForCheckout(cartId);
  
  try {
    // Get cart and items
    const cart = await queryOne<Cart>(`SELECT * FROM carts WHERE id = $1`, [cartId]);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
    
    const items = await queryMany<CartItem & { product_name: string }>(`
      SELECT ci.*, p.name as product_name
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = $1
    `, [cartId]);
    
    if (items.length === 0) {
      throw new ValidationError('Cart is empty');
    }
    
    // Step 3: Acquire checkout locks (with extended expiry)
    const checkoutExpiresAt = addMinutes(new Date(), CHECKOUT_LOCK_DURATION_MINUTES);
    
    const lockResult = await acquireCheckoutLocks(
      cartId,
      items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        start_at: new Date(item.start_at),
        end_at: new Date(item.end_at),
      })),
      checkoutExpiresAt
    );
    
    if (!lockResult.success) {
      await unlockCart(cartId);
      throw new ConflictError('Some items are no longer available', {
        failures: lockResult.failures,
      });
    }
    
    // Calculate total
    const subtotal = items.reduce((sum, item) => sum + Number(item.price), 0);
    const totalDeposit = items.reduce((sum, item) => sum + Number(item.deposit), 0);
    const total = subtotal + totalDeposit;
    const totalCents = Math.round(total * 100);
    
    // Build line items description
    const description = items
      .map(item => item.product_name)
      .join(', ');
    
    // Step 4: Create Stripe payment intent
    const idempotencyKey = `checkout_${cartId}_${Date.now()}`;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'eur',
      description: `Rentbox rental: ${description}`,
      metadata: {
        cart_id: cartId,
        items_count: items.length.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      idempotencyKey,
    });
    
    // Store payment record
    await query(`
      INSERT INTO payments (
        cart_id, provider, intent_id, type, amount, currency,
        status, idempotency_key
      )
      VALUES ($1, 'stripe', $2, 'checkout', $3, 'EUR', 'pending', $4)
    `, [cartId, paymentIntent.id, total, idempotencyKey]);
    
    // Update cart with checkout info
    await query(`
      UPDATE carts 
      SET expires_at = $2, checkout_started_at = NOW()
      WHERE id = $1
    `, [cartId, checkoutExpiresAt.toISOString()]);
    
    // Update locks with checkout expiry
    await query(`
      UPDATE cart_locks SET expires_at = $2 WHERE cart_id = $1
    `, [cartId, checkoutExpiresAt.toISOString()]);
    
    return {
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret!,
      payment_url: `${data.return_url}?payment_intent=${paymentIntent.id}`,
      expires_at: checkoutExpiresAt.toISOString(),
    };
    
  } catch (error) {
    // On any error, unlock the cart
    await unlockCart(cartId);
    throw error;
  }
}

/**
 * Confirm payment and create bookings
 * Called after successful payment (from webhook or client confirmation)
 */
export async function confirmPayment(
  cartId: string,
  paymentIntentId: string
): Promise<PaymentConfirmationResponse> {
  return withTransaction(async (client) => {
    // Get payment record
    const payment = await txQueryOne<Payment>(client, `
      SELECT * FROM payments
      WHERE cart_id = $1 AND intent_id = $2
      FOR UPDATE
    `, [cartId, paymentIntentId]);
    
    if (!payment) {
      throw new NotFoundError('Payment', paymentIntentId);
    }
    
    // Check if already processed (idempotency)
    if (payment.status === 'succeeded') {
      // Return existing bookings
      const bookings = await txQueryMany<Booking>(client, `
        SELECT * FROM bookings WHERE cart_id = $1
      `, [cartId]);
      
      return {
        success: true,
        bookings: await formatBookingsResponse(bookings),
        message: 'Payment already confirmed',
      };
    }
    
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      // Update payment status
      await client.query(`
        UPDATE payments SET status = $2 WHERE id = $1
      `, [payment.id, mapStripeStatus(paymentIntent.status)]);
      
      throw new ValidationError(`Payment not successful. Status: ${paymentIntent.status}`);
    }
    
    // Get cart and items
    const cart = await txQueryOne<Cart>(client, `
      SELECT * FROM carts WHERE id = $1 FOR UPDATE
    `, [cartId]);
    
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
    
    if (cart.status === 'completed') {
      // Already completed - return existing bookings
      const bookings = await txQueryMany<Booking>(client, `
        SELECT * FROM bookings WHERE cart_id = $1
      `, [cartId]);
      
      return {
        success: true,
        bookings: await formatBookingsResponse(bookings),
        message: 'Bookings already created',
      };
    }
    
    // Get cart items with locks
    const items = await txQueryMany<CartItem & { compartment_id: string }>(client, `
      SELECT ci.*, cl.compartment_id
      FROM cart_items ci
      JOIN cart_locks cl ON cl.cart_item_id = ci.id
      WHERE ci.cart_id = $1
    `, [cartId]);
    
    if (items.length === 0) {
      throw new ValidationError('No locked items found for cart');
    }
    
    // Create bookings from locks
    const bookingIds = await createBookingsFromLocks(
      cartId,
      cart.user_id,
      items.map(item => ({
        cartItemId: item.id,
        productId: item.product_id,
        compartmentId: item.compartment_id,
        startAt: new Date(item.start_at),
        endAt: new Date(item.end_at),
        totalPrice: Number(item.price),
        depositAmount: Number(item.deposit),
        priceBreakdown: typeof item.price_breakdown === 'string'
          ? JSON.parse(item.price_breakdown)
          : item.price_breakdown,
      }))
    );
    
    // Update payment status
    await client.query(`
      UPDATE payments SET status = 'succeeded', paid_at = NOW() WHERE id = $1
    `, [payment.id]);
    
    // Get created bookings
    const bookings = await txQueryMany<Booking>(client, `
      SELECT * FROM bookings WHERE id = ANY($1)
    `, [bookingIds]);
    
    // Log audit event
    await client.query(`
      INSERT INTO audit_log (action, entity_type, entity_id, user_id, details)
      VALUES ('payment_confirmed', 'cart', $1, $2, $3)
    `, [
      cartId,
      cart.user_id,
      JSON.stringify({
        payment_intent_id: paymentIntentId,
        booking_ids: bookingIds,
        amount: payment.amount,
      }),
    ]);
    
    return {
      success: true,
      bookings: await formatBookingsResponse(bookings),
      message: 'Payment confirmed and bookings created',
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLING
// ═══════════════════════════════════════════════════════════════════════════

export interface WebhookResult {
  handled: boolean;
  message: string;
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhook(
  signature: string,
  payload: Buffer
): Promise<WebhookResult> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('Stripe webhook secret not configured');
    return { handled: false, message: 'Webhook secret not configured' };
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new ValidationError('Invalid webhook signature');
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      return handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
    
    case 'payment_intent.payment_failed':
      return handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
    
    case 'payment_intent.canceled':
      return handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
    
    case 'payment_intent.expired':
      return handlePaymentExpired(event.data.object as Stripe.PaymentIntent);
    
    default:
      return { handled: false, message: `Unhandled event type: ${event.type}` };
  }
}

async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const cartId = paymentIntent.metadata.cart_id;
  
  if (!cartId) {
    return { handled: false, message: 'No cart_id in payment metadata' };
  }
  
  try {
    await confirmPayment(cartId, paymentIntent.id);
    return { handled: true, message: 'Payment confirmed and bookings created' };
  } catch (error) {
    console.error('Error handling payment success:', error);
    
    // Log for manual recovery
    await query(`
      INSERT INTO audit_log (action, entity_type, entity_id, details)
      VALUES ('webhook_error', 'payment', $1, $2)
    `, [
      paymentIntent.id,
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        cart_id: cartId,
        event: 'payment_intent.succeeded',
      }),
    ]);
    
    throw error;
  }
}

async function handlePaymentFailure(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const cartId = paymentIntent.metadata.cart_id;
  
  if (!cartId) {
    return { handled: false, message: 'No cart_id in payment metadata' };
  }
  
  // Update payment status
  await query(`
    UPDATE payments SET status = 'failed' WHERE intent_id = $1
  `, [paymentIntent.id]);
  
  // Unlock cart and release locks
  await unlockCart(cartId);
  await releaseCartLocks(cartId);
  
  // Log audit event
  await query(`
    INSERT INTO audit_log (action, entity_type, entity_id, details)
    VALUES ('payment_failed', 'payment', $1, $2)
  `, [
    paymentIntent.id,
    JSON.stringify({
      cart_id: cartId,
      failure_message: paymentIntent.last_payment_error?.message,
    }),
  ]);
  
  return { handled: true, message: 'Payment failure handled, cart unlocked' };
}

async function handlePaymentCanceled(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const cartId = paymentIntent.metadata.cart_id;
  
  if (!cartId) {
    return { handled: false, message: 'No cart_id in payment metadata' };
  }
  
  // Update payment status
  await query(`
    UPDATE payments SET status = 'cancelled' WHERE intent_id = $1
  `, [paymentIntent.id]);
  
  // Unlock cart and release locks
  await unlockCart(cartId);
  await releaseCartLocks(cartId);
  
  return { handled: true, message: 'Payment canceled, cart unlocked' };
}

async function handlePaymentExpired(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const cartId = paymentIntent.metadata.cart_id;
  
  if (!cartId) {
    return { handled: false, message: 'No cart_id in payment metadata' };
  }
  
  // Update payment status
  await query(`
    UPDATE payments SET status = 'failed' WHERE intent_id = $1
  `, [paymentIntent.id]);
  
  // Mark cart as expired
  await query(`
    UPDATE carts SET status = 'expired' WHERE id = $1
  `, [cartId]);
  
  await releaseCartLocks(cartId);
  
  return { handled: true, message: 'Payment expired, cart marked as expired' };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function mapStripeStatus(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'processing':
      return 'processing';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'pending';
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

async function formatBookingsResponse(bookings: Booking[]): Promise<BookingResponse[]> {
  const responses: BookingResponse[] = [];
  
  for (const booking of bookings) {
    const product = await queryOne<Product>(`
      SELECT * FROM products WHERE id = $1
    `, [booking.product_id]);
    
    const compartment = await queryOne<Compartment & { locker_name: string; locker_location: string }>(`
      SELECT c.*, l.name as locker_name, l.location as locker_location
      FROM compartments c
      JOIN lockers l ON l.id = c.locker_id
      WHERE c.id = $1
    `, [booking.compartment_id]);
    
    responses.push({
      id: booking.id,
      product: {
        id: product!.id,
        name: product!.name,
        category: product!.category,
        image_url: product!.image_url,
      },
      compartment: {
        id: compartment!.id,
        locker_name: compartment!.locker_name,
        locker_location: compartment!.locker_location,
        compartment_number: compartment!.compartment_number,
      },
      start_at: booking.start_at.toISOString(),
      end_at: booking.end_at.toISOString(),
      status: booking.status,
      total_price: Number(booking.total_price),
      deposit_amount: Number(booking.deposit_amount),
      pickup_code: booking.pickup_code!,
      pickup_instructions: generatePickupInstructions(compartment!),
      created_at: booking.created_at.toISOString(),
    });
  }
  
  return responses;
}

function generatePickupInstructions(
  compartment: Compartment & { locker_name: string; locker_location: string }
): string {
  return `
Visit ${compartment.locker_name} at ${compartment.locker_location}.
Go to compartment ${compartment.compartment_number}.
Enter your pickup code on the keypad to unlock.
Take the tool and close the door securely.
`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT RECOVERY (Admin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manually recover a stuck payment/cart
 */
export async function recoverCart(
  cartId: string,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const cart = await queryOne<Cart>(`SELECT * FROM carts WHERE id = $1`, [cartId]);
  
  if (!cart) {
    throw new NotFoundError('Cart', cartId);
  }
  
  // Check for successful payment
  const payment = await queryOne<Payment>(`
    SELECT * FROM payments WHERE cart_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [cartId]);
  
  if (payment && payment.status === 'succeeded') {
    // Check if bookings exist
    const bookings = await queryMany<Booking>(`
      SELECT * FROM bookings WHERE cart_id = $1
    `, [cartId]);
    
    if (bookings.length === 0) {
      // Payment succeeded but no bookings - try to create them
      try {
        await confirmPayment(cartId, payment.intent_id);
        
        await query(`
          INSERT INTO audit_log (action, entity_type, entity_id, admin_id, details)
          VALUES ('manual_recovery', 'cart', $1, $2, $3)
        `, [cartId, adminId, JSON.stringify({ reason: 'missing_bookings' })]);
        
        return { success: true, message: 'Bookings created from successful payment' };
      } catch (error) {
        return { 
          success: false, 
          message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
      }
    }
    
    return { success: true, message: 'Cart already has bookings' };
  }
  
  // No successful payment - unlock cart for retry
  await unlockCart(cartId);
  await releaseCartLocks(cartId);
  
  // Reset cart expiry
  const newExpiry = addMinutes(new Date(), 15);
  await query(`
    UPDATE carts SET expires_at = $2, status = 'active' WHERE id = $1
  `, [cartId, newExpiry.toISOString()]);
  
  await query(`
    INSERT INTO audit_log (action, entity_type, entity_id, admin_id, details)
    VALUES ('manual_recovery', 'cart', $1, $2, $3)
  `, [cartId, adminId, JSON.stringify({ reason: 'reset_for_retry' })]);
  
  return { success: true, message: 'Cart reset for retry' };
}
