// CartItemCard - Display a cart item with edit/remove options
import { useState } from 'react';
import { format } from 'date-fns';
import { TimeRangeEditor } from './TimeRangeEditor';
import type { CartItem } from '~/lib/booking/types';

interface CartItemCardProps {
	item: CartItem;
	productName?: string;
	onUpdate?: (itemId: string, startAt: Date, endAt: Date) => Promise<void>;
	onRemove?: (itemId: string) => Promise<void>;
	loading?: boolean;
}

export function CartItemCard({
	item,
	productName = 'Product',
	onUpdate,
	onRemove,
	loading = false,
}: CartItemCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);

	const handleUpdate = async (startAt: Date, endAt: Date) => {
		if (!onUpdate) return;

		setIsUpdating(true);
		try {
			await onUpdate(item.id, startAt, endAt);
			setIsEditing(false);
		} catch (error) {
			console.error('Failed to update item:', error);
			alert(error instanceof Error ? error.message : 'Failed to update item');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleRemove = async () => {
		if (!onRemove || !confirm('Remove this item from cart?')) return;

		setIsRemoving(true);
		try {
			await onRemove(item.id);
		} catch (error) {
			console.error('Failed to remove item:', error);
			alert(error instanceof Error ? error.message : 'Failed to remove item');
		} finally {
			setIsRemoving(false);
		}
	};

	return (
		<div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
			<div className="flex justify-between items-start mb-3">
				<div className="flex-1">
					<h3 className="font-semibold text-gray-900">{productName}</h3>
					<div className="text-sm text-gray-600 mt-1">
						{format(new Date(item.start_at), 'PPp')} -{' '}
						{format(new Date(item.end_at), 'PPp')}
					</div>
				</div>
				<div className="flex gap-2">
					{onUpdate && (
						<button
							onClick={() => setIsEditing(!isEditing)}
							disabled={loading || isUpdating || isRemoving}
							className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
						>
							{isEditing ? 'Cancel' : 'Edit'}
						</button>
					)}
					{onRemove && (
						<button
							onClick={handleRemove}
							disabled={loading || isUpdating || isRemoving}
							className="px-3 py-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
						>
							{isRemoving ? 'Removing...' : 'Remove'}
						</button>
					)}
				</div>
			</div>

			{isEditing && onUpdate ? (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<TimeRangeEditor
						startAt={item.start_at}
						endAt={item.end_at}
						onChange={handleUpdate}
						minDate={new Date()}
						disabled={isUpdating}
					/>
					<div className="mt-4 flex justify-end">
						<button
							onClick={() => setIsEditing(false)}
							className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div className="text-sm">
					<div className="flex justify-between">
						<span className="text-gray-600">Price:</span>
						<span className="font-medium">
							€{(item.price / 100).toFixed(2)}
						</span>
					</div>
					<div className="flex justify-between mt-1">
						<span className="text-gray-600">Deposit:</span>
						<span className="font-medium">
							€{(item.deposit / 100).toFixed(2)}
						</span>
					</div>
					<div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
						<span className="font-semibold">Total:</span>
						<span className="font-semibold">
							€{((item.price + item.deposit) / 100).toFixed(2)}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
