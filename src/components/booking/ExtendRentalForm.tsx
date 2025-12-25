// ExtendRentalForm - Form to extend an existing rental
import { useState } from 'react';
import { TimeRangeEditor } from './TimeRangeEditor';
import type { Booking, ExtendRentalResponse } from '~/lib/booking/types';
import { formatPrice } from '~/lib/booking/pricing';

interface ExtendRentalFormProps {
	booking: Booking;
	onExtend: (newEndAt: Date) => Promise<void>;
	onCancel: () => void;
}

export function ExtendRentalForm({
	booking,
	onExtend,
	onCancel,
}: ExtendRentalFormProps) {
	const bookingEndAt = typeof booking.end_at === 'string' 
		? new Date(booking.end_at) 
		: booking.end_at;
	
	const [newEndAt, setNewEndAt] = useState(
		new Date(bookingEndAt.getTime() + 60 * 60 * 1000) // Default: +1 hour
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [extendResult, setExtendResult] = useState<ExtendRentalResponse | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/bookings/${booking.id}/extend`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					new_end_at: newEndAt.toISOString(),
				}),
			});

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to extend rental');
			}

			setExtendResult(data);
			await onExtend(newEndAt);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to extend rental');
		} finally {
			setLoading(false);
		}
	};

	if (extendResult?.success) {
		return (
			<div className="bg-green-50 border border-green-200 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-green-900 mb-2">
					Rental Extended Successfully
				</h3>
				<p className="text-green-700 mb-4">
					Your rental has been extended until{' '}
					{new Date(extendResult.new_end_at).toLocaleString()}.
				</p>
				{extendResult.additional_cost > 0 && (
					<div className="mb-4">
						<p className="text-sm text-green-600">
							Additional cost: {formatPrice(extendResult.additional_cost, 'EUR')}
						</p>
						{extendResult.payment_intent_id && (
							<p className="text-xs text-green-600 mt-1">
								Payment required. Please complete the payment.
							</p>
						)}
					</div>
				)}
				<button
					onClick={onCancel}
					className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
				>
					Close
				</button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="bg-white border border-gray-200 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-4">
					Extend Rental
				</h3>

				<div className="mb-4">
					<p className="text-sm text-gray-600 mb-2">
						Current end time:{' '}
						{bookingEndAt.toLocaleString()}
					</p>
				</div>

				<TimeRangeEditor
					startAt={bookingEndAt}
					endAt={newEndAt}
					onChange={(_, end) => setNewEndAt(end)}
					minDate={bookingEndAt}
				/>

				{error && (
					<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
						<p className="text-sm text-red-600">{error}</p>
					</div>
				)}

				<div className="flex gap-3 mt-6">
					<button
						type="submit"
						disabled={loading}
						className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
					>
						{loading ? 'Extending...' : 'Extend Rental'}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
					>
						Cancel
					</button>
				</div>
			</div>
		</form>
	);
}
