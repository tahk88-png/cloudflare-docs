// CartSummary - Display cart total and summary
import { CountdownTimer } from './CountdownTimer';
import type { Cart, CartItem } from '~/lib/booking/types';
import { formatPrice } from '~/lib/booking/pricing';

interface CartSummaryProps {
	cart: Cart;
	items: CartItem[];
	onCheckout?: () => void;
	checkoutDisabled?: boolean;
	checkoutLoading?: boolean;
}

export function CartSummary({
	cart,
	items,
	onCheckout,
	checkoutDisabled = false,
	checkoutLoading = false,
}: CartSummaryProps) {
	const subtotal = items.reduce((sum, item) => sum + item.price, 0);
	const totalDeposit = items.reduce((sum, item) => sum + item.deposit, 0);
	const total = subtotal + totalDeposit;

	const isExpired = cart.status === 'expired' || new Date(cart.expires_at) < new Date();
	const canCheckout = !isExpired && items.length > 0 && !checkoutDisabled;

	return (
		<div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
			<h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

			<div className="space-y-3 mb-4">
				<div className="flex justify-between text-sm">
					<span className="text-gray-600">Items ({items.length})</span>
					<span className="text-gray-900">{formatPrice(subtotal, 'EUR')}</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-gray-600">Deposit</span>
					<span className="text-gray-900">{formatPrice(totalDeposit, 'EUR')}</span>
				</div>
			</div>

			<div className="border-t border-gray-200 pt-3 mb-4">
				<div className="flex justify-between items-center">
					<span className="text-lg font-semibold text-gray-900">Total</span>
					<span className="text-lg font-semibold text-gray-900">
						{formatPrice(total, 'EUR')}
					</span>
				</div>
				<div className="text-xs text-gray-500 mt-1">
					Deposit will be refunded on return
				</div>
			</div>

			<div className="mb-4">
				<CountdownTimer
					expiresAt={cart.expires_at}
					onExpire={() => {
						// Handle expiry
					}}
				/>
			</div>

			{onCheckout && (
				<button
					onClick={onCheckout}
					disabled={!canCheckout || checkoutLoading}
					className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
						canCheckout && !checkoutLoading
							? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
							: 'bg-gray-300 text-gray-500 cursor-not-allowed'
					}`}
				>
					{checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
				</button>
			)}

			{isExpired && (
				<div className="mt-3 text-sm text-red-600">
					Your cart has expired. Please start over.
				</div>
			)}
		</div>
	);
}
