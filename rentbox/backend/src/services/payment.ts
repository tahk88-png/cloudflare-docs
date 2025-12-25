import Stripe from 'stripe';
import db from '../db/connection.js';
import { Payment } from '../types/index.js';
import { PaymentError, NotFoundError } from '../utils/errors.js';
import bookingService from './booking.js';
import cartService from './cart.js';

export class PaymentService {
  private stripe: Stripe;
  
  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }
  
  /**
   * Create payment intent for cart checkout
   */
  async createCheckoutIntent(
    cartId: string,
    returnUrl: string,
    cancelUrl: string,
    userEmail?: string
  ): Promise<{ client_secret: string; payment_id: string }> {
    // Get cart with items
    const cart = await cartService.getCartWithItems(cartId);
    
    if (cart.items.length === 0) {
      throw new PaymentError('Cart is empty');
    }
    
    // Calculate total
    const total = cart.items.reduce((sum, item) => sum + item.price + item.deposit, 0);
    const amountCents = Math.round(total * 100);
    
    // Create Stripe Payment Intent
    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        cart_id: cartId,
        user_email: userEmail || '',
        item_count: cart.items.length.toString(),
      },
      description: `Rentbox.ee - ${cart.items.length} item(s)`,
    });
    
    // Save payment record
    const paymentResult = await db.query<Payment>(
      `INSERT INTO payments (
        cart_id, provider, intent_id, amount, currency, status, metadata
      ) VALUES ($1, 'stripe', $2, $3, 'EUR', 'pending', $4)
      RETURNING *`,
      [
        cartId,
        intent.id,
        total,
        JSON.stringify({
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_email: userEmail,
        }),
      ]
    );
    
    return {
      client_secret: intent.client_secret!,
      payment_id: paymentResult.rows[0].id,
    };
  }
  
  /**
   * Create payment intent for booking extension
   */
  async createExtensionIntent(
    bookingId: string,
    amount: number,
    userEmail?: string
  ): Promise<{ client_secret: string; payment_id: string }> {
    const amountCents = Math.round(amount * 100);
    
    // Create Stripe Payment Intent
    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        booking_id: bookingId,
        type: 'extension',
        user_email: userEmail || '',
      },
      description: `Rentbox.ee - Booking Extension`,
    });
    
    // Save payment record
    const paymentResult = await db.query<Payment>(
      `INSERT INTO payments (
        booking_ids, provider, intent_id, amount, currency, status, metadata
      ) VALUES ($1, 'stripe', $2, $3, 'EUR', 'pending', $4)
      RETURNING *`,
      [
        [bookingId],
        intent.id,
        amount,
        JSON.stringify({
          type: 'extension',
          booking_id: bookingId,
          user_email: userEmail,
        }),
      ]
    );
    
    return {
      client_secret: intent.client_secret!,
      payment_id: paymentResult.rows[0].id,
    };
  }
  
  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    
    let event: Stripe.Event;
    
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      throw new PaymentError(`Webhook signature verification failed: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Log webhook event
    await this.logWebhookEvent(event);
  }
  
  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(intent: Stripe.PaymentIntent): Promise<void> {
    // Get payment record
    const paymentResult = await db.query<Payment>(
      `SELECT * FROM payments WHERE intent_id = $1`,
      [intent.id]
    );
    
    if (paymentResult.rows.length === 0) {
      console.error(`Payment not found for intent: ${intent.id}`);
      return;
    }
    
    const payment = paymentResult.rows[0];
    
    // Check if already processed (idempotency)
    if (payment.status === 'succeeded') {
      console.log(`Payment ${payment.id} already processed`);
      return;
    }
    
    await db.transaction(async (client) => {
      // Update payment status
      await client.query(
        `UPDATE payments SET status = 'succeeded' WHERE id = $1`,
        [payment.id]
      );
      
      // Create bookings from cart
      if (payment.cart_id) {
        const metadata = intent.metadata || {};
        const bookings = await bookingService.createBookingsFromCart(
          payment.cart_id,
          metadata.user_id
        );
        
        // Link bookings to payment
        await client.query(
          `UPDATE payments SET booking_ids = $1 WHERE id = $2`,
          [bookings.map(b => b.id), payment.id]
        );
        
        console.log(`Created ${bookings.length} bookings for payment ${payment.id}`);
      }
    });
  }
  
  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(intent: Stripe.PaymentIntent): Promise<void> {
    await db.query(
      `UPDATE payments 
       SET status = 'failed',
           metadata = jsonb_set(
             COALESCE(metadata, '{}'),
             '{failure_reason}',
             to_jsonb($1::text)
           )
       WHERE intent_id = $2`,
      [intent.last_payment_error?.message || 'Unknown error', intent.id]
    );
    
    console.log(`Payment failed for intent: ${intent.id}`);
  }
  
  /**
   * Handle canceled payment
   */
  private async handlePaymentCanceled(intent: Stripe.PaymentIntent): Promise<void> {
    await db.query(
      `UPDATE payments SET status = 'cancelled' WHERE intent_id = $1`,
      [intent.id]
    );
    
    // Release cart locks if applicable
    const paymentResult = await db.query<Payment>(
      `SELECT cart_id FROM payments WHERE intent_id = $1`,
      [intent.id]
    );
    
    if (paymentResult.rows.length > 0 && paymentResult.rows[0].cart_id) {
      // Unlock cart
      await db.query(
        `UPDATE carts SET status = 'active' WHERE id = $1`,
        [paymentResult.rows[0].cart_id]
      );
    }
    
    console.log(`Payment canceled for intent: ${intent.id}`);
  }
  
  /**
   * Log webhook event
   */
  private async logWebhookEvent(event: Stripe.Event): Promise<void> {
    const paymentResult = await db.query(
      `SELECT id FROM payments WHERE intent_id = $1`,
      [(event.data.object as any).id]
    );
    
    if (paymentResult.rows.length > 0) {
      await db.query(
        `UPDATE payments 
         SET webhook_events = COALESCE(webhook_events, '[]'::jsonb) || $1::jsonb
         WHERE id = $2`,
        [
          JSON.stringify([{
            type: event.type,
            created: event.created,
            id: event.id,
          }]),
          paymentResult.rows[0].id,
        ]
      );
    }
  }
  
  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const result = await db.query<Payment>(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Payment', paymentId);
    }
    
    return result.rows[0];
  }
  
  /**
   * Get payment by intent ID
   */
  async getPaymentByIntentId(intentId: string): Promise<Payment> {
    const result = await db.query<Payment>(
      `SELECT * FROM payments WHERE intent_id = $1`,
      [intentId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Payment');
    }
    
    return result.rows[0];
  }
}

export default new PaymentService();
