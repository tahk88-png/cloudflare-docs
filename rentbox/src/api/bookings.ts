import { query, transaction } from '../lib/db';
import { findAvailableCompartment, lockCompartment } from '../lib/availability';
import { calculatePrice } from '../lib/pricing';

const json = (res: any, status: number, data: any) => {
    res.status(status).json(data);
};

// POST /api/bookings/:id/extend
export const extendBooking = async (req: any, res: any) => {
    const { id } = req.params;
    const { new_end_at } = req.body;
    
    await transaction(async () => {
        // 1. Get Booking
        const bResult = await query('SELECT * FROM bookings WHERE id = $1', [id]);
        const booking = bResult.rows[0];
        if (!booking) return json(res, 404, { error: 'Booking not found' });
        
        const currentEnd = new Date(booking.end_at);
        const newEnd = new Date(new_end_at);
        
        if (newEnd <= currentEnd) {
            return json(res, 400, { error: 'New end time must be after current end time' });
        }

        // 2. Check Availability for the extension period (same compartment)
        // We only need to check if *this specific compartment* is free from currentEnd to newEnd
        const compartmentId = booking.compartment_id;
        
        // Custom check for specific compartment
        const conflictSql = `
            SELECT 1 FROM bookings 
            WHERE compartment_id = $1 
              AND id != $2
              AND tstzrange(start_at, end_at) && tstzrange($3, $4)
            UNION
            SELECT 1 FROM cart_locks
            WHERE compartment_id = $1
              AND tstzrange(start_at, end_at) && tstzrange($3, $4)
        `;
        const conflict = await query(conflictSql, [compartmentId, id, currentEnd, newEnd]);
        
        if (conflict.rows.length > 0) {
             // If not free, suggest alternative? 
             // (Logic for suggestion would go here: searching other compartments)
             return json(res, 409, { error: 'Compartment not available for extension', suggest_swap: true });
        }

        // 3. Calculate Extra Cost
        // Fetch product to get base price
        const pResult = await query('SELECT * FROM products WHERE id = $1', [booking.product_id]);
        const product = pResult.rows[0];
        
        const pricing = calculatePrice(product, currentEnd, newEnd);
        
        // 4. Create Payment Intent for difference
        // (Simplified: assuming immediate charge or update to existing payment method)
        const paymentIntentId = 'pi_ext_' + Math.random().toString(36).substring(7);
        
        await query(
            `INSERT INTO payments (booking_id, provider, intent_id, amount, status)
             VALUES ($1, 'stripe', $2, $3, 'pending')`,
            [id, paymentIntentId, pricing.total]
        );

        // 5. Update Booking (Optimistic update or wait for webhook? 
        // Usually wait for webhook, but for "Extend" we might want to lock it immediately via a temporary lock or provisional update)
        // Here we'll return the payment intent to frontend to complete payment.
        
        return json(res, 200, {
            paymentIntent: paymentIntentId,
            amount: pricing.total,
            message: 'Payment required to confirm extension'
        });
    });
};
