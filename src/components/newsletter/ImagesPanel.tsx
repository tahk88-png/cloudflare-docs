import { useState, useRef } from "react";
import type { NewsletterImage } from "~/lib/db/types";

interface ImagesPanelProps {
	images: NewsletterImage[];
	onImagesChange: () => void;
}

export function ImagesPanel({ images, onImagesChange }: ImagesPanelProps) {
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("alt_text", "");

			const response = await fetch("/api/images", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Failed to upload image");
			}

			onImagesChange();
		} catch (error) {
			console.error("Failed to upload image:", error);
			alert("Failed to upload image. Please try again.");
		} finally {
			setUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	return (
		<div className="p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-900">Image Library</h2>
				<button
					onClick={() => fileInputRef.current?.click()}
					disabled={uploading}
					className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{uploading ? "Uploading..." : "+ Upload"}
				</button>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/jpg,image/png,image/webp"
				onChange={handleFileSelect}
				className="hidden"
			/>

			{images.length === 0 ? (
				<div className="text-sm text-gray-500 text-center py-8">
					No images uploaded yet. Click "Upload" to add images.
				</div>
			) : (
				<div className="grid grid-cols-2 gap-3">
					{images.map((image) => (
						<div
							key={image.id}
							className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300"
						>
							<div className="aspect-video bg-gray-100 flex items-center justify-center">
								<img
									src={image.file_url}
									alt={image.alt_text || ""}
									className="max-w-full max-h-full object-contain"
								/>
							</div>
							<div className="p-2">
								<div className="text-xs text-gray-600 truncate">
									{image.file_name}
								</div>
								{image.file_size && (
									<div className="text-xs text-gray-400">
										{(image.file_size / 1024).toFixed(1)} KB
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
