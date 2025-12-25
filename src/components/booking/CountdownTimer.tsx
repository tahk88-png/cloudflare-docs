// CountdownTimer - Shows time remaining until cart expiry
import { useEffect, useState } from 'react';
import { differenceInSeconds } from 'date-fns';

interface CountdownTimerProps {
	expiresAt: Date | string;
	onExpire?: () => void;
	className?: string;
}

export function CountdownTimer({ expiresAt, onExpire, className = '' }: CountdownTimerProps) {
	const [timeRemaining, setTimeRemaining] = useState<number>(0);
	const [isExpired, setIsExpired] = useState(false);

	useEffect(() => {
		const updateTimer = () => {
			const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
			const now = new Date();
			const seconds = differenceInSeconds(expiry, now);

			if (seconds <= 0) {
				setIsExpired(true);
				setTimeRemaining(0);
				onExpire?.();
			} else {
				setIsExpired(false);
				setTimeRemaining(seconds);
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);

		return () => clearInterval(interval);
	}, [expiresAt, onExpire]);

	const minutes = Math.floor(timeRemaining / 60);
	const seconds = timeRemaining % 60;

	if (isExpired) {
		return (
			<div className={`text-red-600 font-semibold ${className}`}>
				Cart expired
			</div>
		);
	}

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<div className="flex items-center gap-1">
				<svg
					className="w-4 h-4 text-orange-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span className={`text-sm font-medium ${minutes < 2 ? 'text-red-600' : 'text-gray-700'}`}>
					{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
				</span>
			</div>
			<span className="text-xs text-gray-500">remaining</span>
		</div>
	);
}
