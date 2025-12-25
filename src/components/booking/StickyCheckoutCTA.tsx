// StickyCheckoutCTA - Mobile-friendly sticky checkout button
import { CountdownTimer } from './CountdownTimer';
import type { Cart, CartItem } from '~/lib/booking/types';
import { formatPrice } from '~/lib/booking/pricing';

interface StickyCheckoutCTAProps {
	cart: Cart;
	items: CartItem[];
	onCheckout?: () => void;
	checkoutDisabled?: boolean;
	checkoutLoading?: boolean;
}

export function StickyCheckoutCTA({
	cart,
	items,
	onCheckout,
	checkoutDisabled = false,
	checkoutLoading = false,
}: StickyCheckoutCTAProps) {
	const total = items.reduce(
		(sum, item) => sum + item.price + item.deposit,
		0
	);

	const isExpired = cart.status === 'expired' || new Date(cart.expires_at) < new Date();
	const canCheckout = !isExpired && items.length > 0 && !checkoutDisabled;

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
			<div className="max-w-screen-xl mx-auto px-4 py-3">
				<div className="flex items-center justify-between mb-2">
					<div className="flex-1">
						<div className="text-sm font-semibold text-gray-900">
							Total: {formatPrice(total, 'EUR')}
						</div>
						<CountdownTimer
							expiresAt={cart.expires_at}
							className="text-xs mt-1"
						/>
					</div>
					<button
						onClick={onCheckout}
						disabled={!canCheckout || checkoutLoading}
						className={`ml-4 px-6 py-2 rounded-md font-medium transition-colors ${
							canCheckout && !checkoutLoading
								? 'bg-blue-600 text-white hover:bg-blue-700'
								: 'bg-gray-300 text-gray-500 cursor-not-allowed'
						}`}
					>
						{checkoutLoading ? 'Processing...' : 'Checkout'}
					</button>
				</div>
			</div>
		</div>
	);
}
