// CartView - Main cart component
import { useState, useEffect } from 'react';
import { CartItemCard } from './CartItemCard';
import { CartSummary } from './CartSummary';
import { StickyCheckoutCTA } from './StickyCheckoutCTA';
import type { Cart, CartItem } from '~/lib/booking/types';

interface CartViewProps {
	cartId: string;
	onCheckout?: () => void;
}

export function CartView({ cartId, onCheckout }: CartViewProps) {
	const [cart, setCart] = useState<Cart | null>(null);
	const [items, setItems] = useState<CartItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadCart();
		const interval = setInterval(loadCart, 5000); // Refresh every 5 seconds
		return () => clearInterval(interval);
	}, [cartId]);

	const loadCart = async () => {
		try {
			const response = await fetch(`/api/cart/${cartId}`);
			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to load cart');
			}

			setCart(data.cart);
			setItems(data.items || []);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load cart');
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateItem = async (itemId: string, startAt: Date, endAt: Date) => {
		try {
			const response = await fetch(`/api/cart/${cartId}/items/${itemId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					start_at: startAt.toISOString(),
					end_at: endAt.toISOString(),
				}),
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to update item');
			}

			await loadCart();
		} catch (err) {
			throw err;
		}
	};

	const handleRemoveItem = async (itemId: string) => {
		try {
			const response = await fetch(`/api/cart/${cartId}/items/${itemId}`, {
				method: 'DELETE',
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to remove item');
			}

			await loadCart();
		} catch (err) {
			throw err;
		}
	};

	const handleCheckout = async () => {
		// Validate cart first
		try {
			const response = await fetch(`/api/cart/${cartId}/validate`, {
				method: 'POST',
			});

			const data = await response.json();

			if (!data.success || !data.validation.valid) {
				const errors = data.validation?.errors || [];
				alert(
					`Cannot checkout: ${errors.map((e: any) => e.error).join(', ')}`
				);
				return;
			}

			onCheckout?.();
		} catch (err) {
			alert(
				`Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-600">Loading cart...</div>
			</div>
		);
	}

	if (error || !cart) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-red-600">
					{error || 'Cart not found'}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
			<div className="max-w-7xl mx-auto px-4 py-8">
				<h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						{items.length === 0 ? (
							<div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
								<p className="text-gray-600">Your cart is empty</p>
							</div>
						) : (
							items.map((item) => (
								<CartItemCard
									key={item.id}
									item={item}
									onUpdate={handleUpdateItem}
									onRemove={handleRemoveItem}
									loading={loading}
								/>
							))
						)}
					</div>

					<div className="lg:col-span-1">
						<div className="sticky top-4">
							<CartSummary
								cart={cart}
								items={items}
								onCheckout={handleCheckout}
								checkoutDisabled={loading}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Mobile sticky CTA */}
			<StickyCheckoutCTA
				cart={cart}
				items={items}
				onCheckout={handleCheckout}
				checkoutDisabled={loading}
			/>
		</div>
	);
}
