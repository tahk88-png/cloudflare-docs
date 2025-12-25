import { query, transaction } from '../lib/db';
import { releaseCartLocks } from '../lib/availability';

const json = (res: any, status: number, data: any) => {
    res.status(status).json(data);
};

// POST /api/cart/:id/checkout
export const checkout = async (req: any, res: any) => {
    const { id } = req.params;
    
    // 1. Validate Cart Expiry
    const cartResult = await query('SELECT * FROM carts WHERE id = $1', [id]);
    const cart = cartResult.rows[0];
    
    if (!cart || new Date() > new Date(cart.expires_at)) {
        return json(res, 400, { error: 'Cart expired' });
    }
    
    // 2. Calculate Total
    const itemsResult = await query('SELECT * FROM cart_items WHERE cart_id = $1', [id]);
    const items = itemsResult.rows;
    if (items.length === 0) return json(res, 400, { error: 'Cart empty' });
    
    const totalAmount = items.reduce((sum: number, item: any) => sum + parseFloat(item.price), 0);
    const totalDeposit = items.reduce((sum: number, item: any) => sum + parseFloat(item.deposit), 0);
    const finalTotal = totalAmount + totalDeposit;

    // 3. Create Payment Intent (Mock Stripe)
    // const paymentIntent = await stripe.paymentIntents.create({ ... });
    const paymentIntentId = 'pi_mock_' + Math.random().toString(36).substring(7);
    
    // 4. Save Payment Record
    await query(
        `INSERT INTO payments (cart_id, provider, intent_id, amount, status)
         VALUES ($1, 'stripe', $2, $3, 'pending')`,
        [id, paymentIntentId, finalTotal]
    );

    return json(res, 200, { 
        clientSecret: 'secret_mock_' + paymentIntentId,
        amount: finalTotal 
    });
};

// POST /api/payments/webhook
// This handles the async confirmation from Stripe
export const handlePaymentWebhook = async (req: any, res: any) => {
    const event = req.body;
    
    if (event.type === 'payment_intent.succeeded') {
        const intentId = event.data.object.id;
        
        await transaction(async () => {
            // 1. Find Payment
            const payResult = await query('SELECT * FROM payments WHERE intent_id = $1', [intentId]);
            const payment = payResult.rows[0];
            if (!payment) throw new Error('Payment not found');
            
            // 2. Update Payment Status
            await query("UPDATE payments SET status = 'succeeded' WHERE id = $1", [payment.id]);
            
            // 3. Convert Cart Items to Bookings
            const itemsRes = await query('SELECT * FROM cart_items WHERE cart_id = $1', [payment.cart_id]);
            const items = itemsRes.rows;
            
            for (const item of items) {
                // Find the locked compartment for this item
                // NOTE: This logic needs to be robust. 
                // We should have stored the specific compartment_id in cart_items or rely on finding the lock.
                // For this example, we re-query the lock.
                const lockRes = await query(
                    'SELECT compartment_id FROM cart_locks WHERE cart_id = $1 AND product_id = $2 LIMIT 1',
                    [payment.cart_id, item.product_id]
                );
                const compartmentId = lockRes.rows[0]?.compartment_id;
                
                if (compartmentId) {
                    await query(
                        `INSERT INTO bookings (user_id, product_id, compartment_id, start_at, end_at, status, total_price)
                         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)`,
                        [null, item.product_id, compartmentId, item.start_at, item.end_at, item.price]
                    );
                } else {
                    console.error('CRITICAL: Locked compartment not found for paid item', item.id);
                    // Trigger manual admin recovery flow
                }
            }
            
            // 4. Mark Cart as Converted
            await query("UPDATE carts SET status = 'converted' WHERE id = $1", [payment.cart_id]);
            
            // 5. Release Locks (Bookings now hold the spot via the EXCLUDE constraint logic or specific check)
            // Ideally bookings are the hard truth now.
            await releaseCartLocks(payment.cart_id);
        });
    }
    
    return json(res, 200, { received: true });
};
