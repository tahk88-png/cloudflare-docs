import React, { useState, useEffect } from 'react';
import { Button, Card, Badge } from './ui';
import { Cart as CartType, CartItem, PricingBreakdown } from '../types';

// Helper to format currency
const formatMoney = (amount: number) => `€${amount.toFixed(2)}`;

// Countdown Timer Component
export const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="text-sm font-mono bg-orange-100 text-orange-800 px-2 py-1 rounded flex items-center gap-2">
      <span>⏱</span>
      <span>{timeLeft}</span>
    </div>
  );
};

// Cart Item Card
export const CartItemCard = ({ item, onRemove, onUpdate }: { item: CartItem, onRemove: () => void, onUpdate: (start: string, end: string) => void }) => {
  return (
    <Card className="p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{item.product?.name || 'Tool Rental'}</h3>
          <p className="text-sm text-gray-500">Locker {item.product_id.substring(0, 4)}...</p>
        </div>
        <Button variant="destructive" onClick={onRemove} className="text-xs px-2 py-1">Remove</Button>
      </div>
      
      <div className="my-4 space-y-2">
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Start Time</label>
            <input 
                type="datetime-local" 
                className="border rounded px-2 py-1 text-sm"
                value={item.start_at.substring(0, 16)}
                onChange={(e) => onUpdate(e.target.value, item.end_at)}
            />
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">End Time</label>
            <input 
                type="datetime-local" 
                className="border rounded px-2 py-1 text-sm"
                value={item.end_at.substring(0, 16)}
                onChange={(e) => onUpdate(item.start_at, e.target.value)}
            />
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500">
            Deposit: {formatMoney(item.deposit)}
        </div>
        <div className="font-bold text-lg text-blue-600">
            {formatMoney(item.price)}
        </div>
      </div>
    </Card>
  );
};

// Price Breakdown
export const PriceBreakdown = ({ cart }: { cart: CartType }) => {
    const total = cart.items.reduce((acc, item) => acc + item.price, 0);
    const deposit = cart.items.reduce((acc, item) => acc + item.deposit, 0);
    
    return (
        <Card className="p-4 bg-gray-50">
            <h4 className="font-semibold mb-3">Summary</h4>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Rentals Total</span>
                    <span>{formatMoney(total)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                    <span>Deposits (Refundable)</span>
                    <span>{formatMoney(deposit)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-base">
                    <span>Total to Pay</span>
                    <span>{formatMoney(total + deposit)}</span>
                </div>
            </div>
        </Card>
    );
};

// Main Cart View
export const CartView = () => {
    // Mock data state
    const [cart, setCart] = useState<CartType | null>({
        id: 'cart-123',
        status: 'active',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        items: [
            {
                id: 'item-1',
                cart_id: 'cart-123',
                product_id: 'p1',
                start_at: new Date().toISOString(),
                end_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
                price: 25.00,
                deposit: 50.00,
                product: {
                    id: 'p1',
                    name: 'Heavy Duty Drill',
                    base_price_per_hour: 5.00
                }
            }
        ]
    });

    const handleCheckout = () => {
        alert('Proceeding to checkout...');
    };

    if (!cart) return <div>Loading...</div>;

    return (
        <div className="max-w-md mx-auto p-4 pb-24">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">My Cart</h1>
                <CountdownTimer expiresAt={cart.expires_at} />
            </header>

            <div className="space-y-4">
                {cart.items.map(item => (
                    <CartItemCard 
                        key={item.id} 
                        item={item} 
                        onRemove={() => console.log('Remove', item.id)}
                        onUpdate={(s, e) => console.log('Update', s, e)}
                    />
                ))}
            </div>

            <div className="mt-6">
                <PriceBreakdown cart={cart} />
            </div>

            {/* Sticky Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent">
                <div className="max-w-md mx-auto flex gap-4">
                    <div className="flex-1">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="font-bold text-xl">
                            {formatMoney(cart.items.reduce((a, b) => a + b.price + b.deposit, 0))}
                        </div>
                    </div>
                    <Button 
                        className="flex-1" 
                        onClick={handleCheckout}
                        disabled={cart.items.length === 0}
                    >
                        Checkout
                    </Button>
                </div>
            </div>
        </div>
    );
};
