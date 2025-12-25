// AdminCartsView - Admin view of all carts
import { useState, useEffect } from 'react';
import { CountdownTimer } from '../CountdownTimer';
import type { Cart } from '~/lib/booking/types';

interface AdminCart extends Cart {
	item_count: number;
}

export function AdminCartsView() {
	const [carts, setCarts] = useState<AdminCart[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<string>('active');

	useEffect(() => {
		loadCarts();
		const interval = setInterval(loadCarts, 10000); // Refresh every 10 seconds
		return () => clearInterval(interval);
	}, [statusFilter]);

	const loadCarts = async () => {
		try {
			const response = await fetch(`/api/admin/carts?status=${statusFilter}&limit=100`);
			const data = await response.json();

			if (data.success) {
				setCarts(data.carts);
			}
		} catch (error) {
			console.error('Failed to load carts:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleRecover = async (cartId: string) => {
		if (!confirm('Recover this cart?')) return;

		try {
			const response = await fetch(`/api/admin/carts/${cartId}/recover`, {
				method: 'POST',
			});

			const data = await response.json();

			if (data.success) {
				await loadCarts();
			} else {
				alert(data.error || 'Failed to recover cart');
			}
		} catch (error) {
			alert('Failed to recover cart');
		}
	};

	if (loading) {
		return <div className="p-4">Loading carts...</div>;
	}

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Carts</h1>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="px-3 py-2 border border-gray-300 rounded-md"
				>
					<option value="active">Active</option>
					<option value="locked">Locked</option>
					<option value="expired">Expired</option>
					<option value="completed">Completed</option>
					<option value="abandoned">Abandoned</option>
				</select>
			</div>

			<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Cart ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								User ID
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Items
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Expires
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{carts.map((cart) => (
							<tr key={cart.id}>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
									{cart.id.substring(0, 8)}...
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{cart.user_id ? cart.user_id.substring(0, 8) + '...' : 'Guest'}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span
										className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
											cart.status === 'active'
												? 'bg-green-100 text-green-800'
												: cart.status === 'expired'
													? 'bg-red-100 text-red-800'
													: 'bg-gray-100 text-gray-800'
										}`}
									>
										{cart.status}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{cart.item_count}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{cart.status === 'active' ? (
										<CountdownTimer expiresAt={cart.expires_at} />
									) : (
										new Date(cart.expires_at).toLocaleString()
									)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm">
									{cart.status === 'locked' && (
										<button
											onClick={() => handleRecover(cart.id)}
											className="text-blue-600 hover:text-blue-900"
										>
											Recover
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
