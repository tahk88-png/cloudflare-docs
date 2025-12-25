'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from 'lucide-react';
import { formatPrice, calculatePricing } from '@/lib/pricing';
import { AvailabilityInfo } from '@/lib/availability';
import type { Product, Compartment, Locker } from '@prisma/client';

interface BookingSectionProps {
	product: Product & {
		category: { name: string; slug: string } | null;
		compartments: (Compartment & { locker: Locker })[];
	};
	availability: AvailabilityInfo;
	compartments: (Compartment & { locker: Locker })[];
}

export function BookingSection({ product, availability, compartments }: BookingSectionProps) {
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [startTime, setStartTime] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [selectedCompartment, setSelectedCompartment] = useState<string>('');

	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
		setStartTime('');
		setEndTime('');
	};

	const handleBooking = async () => {
		if (!selectedDate || !startTime || !endTime) {
			return;
		}

		// Auto-select compartment if only one available
		const compartmentId = compartments.length === 1 
			? compartments[0].id 
			: selectedCompartment;

		if (!compartmentId) {
			alert('Palun vali kapp');
			return;
		}

		const formData = new FormData();
		formData.append('productId', product.id);
		formData.append('compartmentId', compartmentId);
		formData.append('date', selectedDate.toISOString().split('T')[0]);
		formData.append('startTime', startTime);
		formData.append('endTime', endTime);

		try {
			const response = await fetch('/actions/booking', {
				method: 'POST',
				body: formData,
			});

			const result = await response.json();

			if (result.success) {
				alert('Broneering loodud!');
				// TODO: Redirect to confirmation page
			} else {
				alert(result.error || 'Broneeringu loomine ebaõnnestus');
			}
		} catch (error) {
			console.error('Booking error:', error);
			alert('Broneeringu loomine ebaõnnestus. Palun proovi uuesti.');
		}
	};

	// Calculate pricing if times are selected
	let pricing = null;
	if (selectedDate && startTime && endTime) {
		const [startHour, startMin] = startTime.split(':').map(Number);
		const [endHour, endMin] = endTime.split(':').map(Number);
		
		const startDate = new Date(selectedDate);
		startDate.setHours(startHour, startMin, 0, 0);
		
		const endDate = new Date(selectedDate);
		endDate.setHours(endHour, endMin, 0, 0);
		
		if (endDate > startDate) {
			pricing = calculatePricing({
				basePrice: Number(product.basePrice),
				priceUnit: product.priceUnit as 'hour' | 'day',
				startDate,
				endDate,
			});
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Broneeri</CardTitle>
				<CardDescription>
					Vali kuupäev ja aeg, siis kinnita broneering
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Availability Status */}
				<div>
					<Badge
						variant={
							availability.status === 'available'
								? 'success'
								: availability.status === 'limited'
									? 'warning'
									: 'secondary'
						}
					>
						{availability.hint}
					</Badge>
					{availability.nextAvailable && (
						<p className="mt-2 text-sm text-muted-foreground">
							{availability.hint}
						</p>
					)}
				</div>

				<Separator />

				{/* Date Selection */}
				<div>
					<label className="mb-2 block text-sm font-medium">Kuupäev</label>
					<input
						type="date"
						min={new Date().toISOString().split('T')[0]}
						onChange={(e) => {
							if (e.target.value) {
								handleDateSelect(new Date(e.target.value));
							}
						}}
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
				</div>

				{/* Time Selection */}
				{selectedDate && (
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="mb-2 block text-sm font-medium">Algus</label>
							<input
								type="time"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								step={product.slotMinutes * 60}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
						<div>
							<label className="mb-2 block text-sm font-medium">Lõpp</label>
							<input
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
								min={startTime}
								step={product.slotMinutes * 60}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
					</div>
				)}

				{/* Compartment Selection */}
				{compartments.length > 1 && selectedDate && startTime && endTime && (
					<div>
						<label className="mb-2 block text-sm font-medium">Asukoht</label>
						<select
							value={selectedCompartment}
							onChange={(e) => setSelectedCompartment(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">Vali kapp</option>
							{compartments.map((comp) => (
								<option key={comp.id} value={comp.id}>
									{comp.locker.name} - {comp.label}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Pricing */}
				{pricing && (
					<div className="rounded-lg border bg-muted/50 p-4">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-sm font-medium">Hind kokku</span>
							<span className="text-lg font-bold">{pricing.finalPrice.toFixed(2)} €</span>
						</div>
						{pricing.breakdown.length > 1 && (
							<div className="mt-2 space-y-1 text-xs text-muted-foreground">
								{pricing.breakdown.map((line, i) => (
									<div key={i}>{line}</div>
								))}
							</div>
						)}
					</div>
				)}

				<Separator />

				{/* Booking Button */}
				<Button
					className="w-full"
					size="lg"
					onClick={handleBooking}
					disabled={
						availability.status === 'unavailable' ||
						!selectedDate ||
						!startTime ||
						!endTime ||
						(compartments.length > 1 && !selectedCompartment)
					}
				>
					<Calendar className="mr-2 h-4 w-4" />
					Kinnita broneering
				</Button>

				<p className="text-center text-xs text-muted-foreground">
					Broneerimisel kinnitad, et oled tutvunud{' '}
					<Link href="/tingimused" className="underline">
						kasutustingimustega
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
