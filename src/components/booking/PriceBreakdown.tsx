// PriceBreakdown - Display detailed price breakdown
import type { PriceBreakdown } from '~/lib/booking/types';
import { formatPrice } from '~/lib/booking/pricing';

interface PriceBreakdownProps {
	breakdown: PriceBreakdown;
	className?: string;
}

export function PriceBreakdown({ breakdown, className = '' }: PriceBreakdownProps) {
	return (
		<div className={`space-y-2 ${className}`}>
			<div className="text-sm font-medium text-gray-700 mb-3">Price Breakdown</div>

			{breakdown.breakdown_items.map((item, index) => (
				<div
					key={index}
					className="flex justify-between items-start text-sm"
				>
					<div className="flex-1">
						<div className="text-gray-700">{item.label}</div>
						{item.description && (
							<div className="text-xs text-gray-500 mt-0.5">
								{item.description}
							</div>
						)}
					</div>
					<div
						className={`font-medium ${
							item.amount < 0 ? 'text-green-600' : 'text-gray-900'
						}`}
					>
						{item.amount < 0 ? '-' : ''}
						{formatPrice(Math.abs(item.amount), breakdown.currency)}
					</div>
				</div>
			))}

			<div className="border-t border-gray-200 pt-2 mt-2">
				<div className="flex justify-between items-center">
					<div className="font-medium text-gray-900">Subtotal</div>
					<div className="font-medium text-gray-900">
						{formatPrice(breakdown.subtotal, breakdown.currency)}
					</div>
				</div>
			</div>

			<div className="border-t border-gray-300 pt-2">
				<div className="flex justify-between items-center">
					<div className="font-semibold text-lg text-gray-900">Total</div>
					<div className="font-semibold text-lg text-gray-900">
						{formatPrice(breakdown.total, breakdown.currency)}
					</div>
				</div>
				<div className="text-xs text-gray-500 mt-1">
					Includes {formatPrice(breakdown.deposit, breakdown.currency)} deposit
					(refundable)
				</div>
			</div>

			<div className="text-xs text-gray-500 mt-2">
				Rental duration: {breakdown.hours} hour{breakdown.hours !== 1 ? 's' : ''}
				{breakdown.days > 0 && ` (${breakdown.days} day${breakdown.days !== 1 ? 's' : ''})`}
			</div>
		</div>
	);
}
