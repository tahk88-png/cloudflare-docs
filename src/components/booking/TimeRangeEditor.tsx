// TimeRangeEditor - Edit start and end times for a rental
import { useState } from 'react';
import { format } from 'date-fns';

interface TimeRangeEditorProps {
	startAt: Date | string;
	endAt: Date | string;
	onChange: (startAt: Date, endAt: Date) => void;
	minDate?: Date;
	disabled?: boolean;
}

export function TimeRangeEditor({
	startAt,
	endAt,
	onChange,
	minDate,
	disabled = false,
}: TimeRangeEditorProps) {
	const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
	const end = typeof endAt === 'string' ? new Date(endAt) : endAt;

	const [localStart, setLocalStart] = useState(
		format(start, "yyyy-MM-dd'T'HH:mm")
	);
	const [localEnd, setLocalEnd] = useState(format(end, "yyyy-MM-dd'T'HH:mm"));

	const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newStart = new Date(e.target.value);
		setLocalStart(e.target.value);

		// Ensure end is after start
		if (newStart >= end) {
			const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000); // Add 1 hour
			setLocalEnd(format(newEnd, "yyyy-MM-dd'T'HH:mm"));
			onChange(newStart, newEnd);
		} else {
			onChange(newStart, end);
		}
	};

	const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newEnd = new Date(e.target.value);
		setLocalEnd(e.target.value);

		// Ensure end is after start
		if (newEnd <= start) {
			return; // Don't update if invalid
		}

		onChange(start, newEnd);
	};

	const minDateTime = minDate ? format(minDate, "yyyy-MM-dd'T'HH:mm") : undefined;

	return (
		<div className="space-y-4">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Start Time
				</label>
				<input
					type="datetime-local"
					value={localStart}
					onChange={handleStartChange}
					min={minDateTime}
					disabled={disabled}
					className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					End Time
				</label>
				<input
					type="datetime-local"
					value={localEnd}
					onChange={handleEndChange}
					min={localStart}
					disabled={disabled}
					className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	);
}
