import React, { useState, useRef } from "react";

interface ReturnFlowProps {
	bookingId: string;
	endAt: string;
	onReturnSubmitted?: () => void;
}

export default function ReturnFlow({
	bookingId,
	endAt,
	onReturnSubmitted,
}: ReturnFlowProps) {
	const [photos, setPhotos] = useState<File[]>([]);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [overdue, setOverdue] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length + photos.length > 3) {
			setError("Maximum 3 photos allowed");
			return;
		}
		setPhotos([...photos, ...files]);
		setError(null);
	};

	const removePhoto = (index: number) => {
		setPhotos(photos.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setUploading(true);
		setError(null);

		try {
			const formData = new FormData();
			photos.forEach((photo) => {
				formData.append("photos", photo);
			});

			const response = await fetch(`/api/bookings/${bookingId}/return`, {
				method: "POST",
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to submit return");
			}

			setSuccess(true);
			setOverdue(data.overdue);
			if (onReturnSubmitted) {
				onReturnSubmitted();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit return");
		} finally {
			setUploading(false);
		}
	};

	const endDate = new Date(endAt);
	const now = new Date();
	const isOverdue = now > endDate;
	const daysOverdue = isOverdue
		? Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
		: 0;

	if (success) {
		return (
			<div className="return-success p-6 bg-green-50 border border-green-200 rounded-lg">
				<div className="flex items-center gap-3 mb-4">
					<svg
						className="w-6 h-6 text-green-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
					<h3 className="text-lg font-semibold text-green-800">
						Return Request Submitted
					</h3>
				</div>
				<p className="text-green-700 mb-2">
					{overdue
						? `This booking is overdue by ${daysOverdue} day${
								daysOverdue !== 1 ? "s" : ""
						  }. Your return request has been submitted and will be reviewed by an admin.`
						: "Your return request has been submitted successfully. Awaiting admin confirmation."}
				</p>
			</div>
		);
	}

	return (
		<div className="return-flow p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					Return Tool
				</h2>
				<div className="text-sm text-gray-600">
					<p>
						Booking ends: {endDate.toLocaleDateString()} at{" "}
						{endDate.toLocaleTimeString()}
					</p>
					{isOverdue && (
						<p className="text-red-600 font-medium mt-1">
							⚠️ Overdue by {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
						</p>
					)}
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label
						htmlFor="photos"
						className="block text-sm font-medium text-gray-700 mb-2"
					>
						Return Photos (Optional, max 3)
					</label>
					<input
						ref={fileInputRef}
						type="file"
						id="photos"
						name="photos"
						accept="image/jpeg,image/jpg,image/png,image/webp"
						multiple
						onChange={handlePhotoChange}
						disabled={uploading || photos.length >= 3}
						className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
					/>
					<p className="mt-1 text-xs text-gray-500">
						Upload photos to document the condition of the returned tool
					</p>

					{photos.length > 0 && (
						<div className="mt-4 grid grid-cols-3 gap-4">
							{photos.map((photo, index) => (
								<div key={index} className="relative">
									<img
										src={URL.createObjectURL(photo)}
										alt={`Return photo ${index + 1}`}
										className="w-full h-32 object-cover rounded border border-gray-300"
									/>
									<button
										type="button"
										onClick={() => removePhoto(index)}
										className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
										aria-label="Remove photo"
									>
										×
									</button>
									<p className="mt-1 text-xs text-gray-600 truncate">
										{photo.name}
									</p>
								</div>
							))}
						</div>
					)}
				</div>

				{error && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
						<p className="text-sm text-red-800">{error}</p>
					</div>
				)}

				<button
					type="submit"
					disabled={uploading}
					className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
				>
					{uploading ? "Submitting..." : "I Returned the Tool"}
				</button>
			</form>
		</div>
	);
}
