// AdminBookingsView - Admin view of all bookings
import { useState, useEffect } from 'react';
import type { Booking } from '~/lib/booking/types';

interface AdminBooking extends Booking {
	product_name: string;
	compartment_number: string;
}

export function AdminBookingsView() {
	const [bookings, setBookings] = useState<AdminBooking[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<string>('');

	useEffect(() => {
		loadBookings();
		const interval = setInterval(loadBookings, 30000); // Refresh every 30 seconds
		return () => clearInterval(interval);
	}, [statusFilter]);

	const loadBookings = async () => {
		try {
			const url = new URL('/api/admin/bookings', window.location.origin);
			if (statusFilter) {
				url.searchParams.set('status', statusFilter);
			}
			url.searchParams.set('limit', '100');

			const response = await fetch(url.toString());
			const data = await response.json();

			if (data.success) {
				setBookings(data.bookings);
			}
		} catch (error) {
			console.error('Failed to load bookings:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleForceRelease = async (bookingId: string) => {
		const reason = prompt('Reason for force release:');
		if (!reason) return;

		try {
			const response = await fetch(`/api/admin/bookings/${bookingId}/force-release`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason }),
			});

			const data = await response.json();

			if (data.success) {
				await loadBookings();
			} else {
				alert(data.error || 'Failed to release booking');
			}
		} catch (error) {
			alert('Failed to release booking');
		}
	};

	if (loading) {
		return <div className="p-4">Loading bookings...</div>;
	}

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="px-3 py-2 border border-gray-300 rounded-md"
				>
					<option value="">All Statuses</option>
					<option value="pending">Pending</option>
					<option value="confirmed">Confirmed</option>
					<option value="active">Active</option>
					<option value="completed">Completed</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Booking ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Product
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Compartment
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Time Range
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Total
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{bookings.map((booking) => (
							<tr key={booking.id}>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
									{booking.id.substring(0, 8)}...
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{booking.product_name}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{booking.compartment_number}
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">
									<div>
										{new Date(booking.start_at).toLocaleString()}
									</div>
									<div className="text-xs text-gray-400">
										→ {new Date(booking.end_at).toLocaleString()}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span
										className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
											booking.status === 'active'
												? 'bg-green-100 text-green-800'
												: booking.status === 'completed'
													? 'bg-blue-100 text-blue-800'
													: booking.status === 'cancelled'
														? 'bg-red-100 text-red-800'
														: 'bg-gray-100 text-gray-800'
										}`}
									>
										{booking.status}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									€{(booking.total_price / 100).toFixed(2)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm">
									{booking.status !== 'completed' && booking.status !== 'cancelled' && (
										<button
											onClick={() => handleForceRelease(booking.id)}
											className="text-red-600 hover:text-red-900"
										>
											Release
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
