import { query } from '../lib/db';
import { lockCompartment, releaseCartLocks } from '../lib/availability';
import { calculatePrice } from '../lib/pricing';
import { Product } from '../types';

// Mock Response helper
const json = (res: any, status: number, data: any) => {
    res.status(status).json(data);
};

// GET /api/cart/:id
export const getCart = async (req: any, res: any) => {
    const { id } = req.params;
    const result = await query('SELECT * FROM carts WHERE id = $1', [id]);
    const cart = result.rows[0];
    
    if (!cart) return json(res, 404, { error: 'Cart not found' });
    
    // Get Items
    const itemsResult = await query('SELECT * FROM cart_items WHERE cart_id = $1', [id]);
    cart.items = itemsResult.rows;
    
    return json(res, 200, cart);
};

// POST /api/cart
export const createCart = async (req: any, res: any) => {
    // 15 min TTL
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const result = await query(
        'INSERT INTO carts (expires_at) VALUES ($1) RETURNING id', 
        [expiresAt]
    );
    return json(res, 201, { cartId: result.rows[0].id, expiresAt });
};

// POST /api/cart/:id/items
export const addItem = async (req: any, res: any) => {
    const { id } = req.params;
    const { product_id, start_at, end_at } = req.body;
    
    // 1. Get Product
    const pResult = await query('SELECT * FROM products WHERE id = $1', [product_id]);
    const product = pResult.rows[0];
    if (!product) return json(res, 404, { error: 'Product not found' });

    // 2. Check Availability & Lock
    const start = new Date(start_at);
    const end = new Date(end_at);
    const lockResult = await lockCompartment(id, product_id, start, end);
    
    if (!lockResult.available) {
        return json(res, 409, { error: 'Not available', reason: lockResult.reason });
    }

    // 3. Calculate Price
    const pricing = calculatePrice(product, start, end);
    
    // 4. Add to Cart Items
    const itemResult = await query(
        `INSERT INTO cart_items (cart_id, product_id, start_at, end_at, price, deposit)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, product_id, start, end, pricing.total, pricing.deposit]
    );

    return json(res, 201, itemResult.rows[0]);
};

// DELETE /api/cart/:id/items/:item_id
export const removeItem = async (req: any, res: any) => {
    const { id, item_id } = req.params;
    
    // Remove item
    await query('DELETE FROM cart_items WHERE id = $1 AND cart_id = $2', [item_id, id]);
    
    // Ideally, release the specific lock here too. 
    // Simplified: We rely on the lock expiry or a background job cleanup, 
    // OR we can explicitly delete the lock for this item if we tracked the link.
    // In our schema, cart_locks links to cart_id/product_id/compartment_id but not directly cart_item_id.
    // Better schema would link cart_locks to cart_items.
    
    return json(res, 200, { success: true });
};
