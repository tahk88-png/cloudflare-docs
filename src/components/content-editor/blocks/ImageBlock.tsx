/**
 * Image Block Component
 */

import { useState, useEffect } from "react";
import type { ImageBlockContent } from "~/lib/content-creation/types";

export interface ImageBlockProps {
	content: ImageBlockContent;
	onUpdate: (content: ImageBlockContent) => void;
}

export function ImageBlock({ content, onUpdate }: ImageBlockProps) {
	const [altText, setAltText] = useState(content.altText);
	const [caption, setCaption] = useState(content.caption || "");
	const [layout, setLayout] = useState(content.layout);

	useEffect(() => {
		setAltText(content.altText);
		setCaption(content.caption || "");
		setLayout(content.layout);
	}, [content]);

	const handleAltTextChange = (newAltText: string) => {
		setAltText(newAltText);
		onUpdate({ ...content, altText: newAltText });
	};

	const handleCaptionChange = (newCaption: string) => {
		setCaption(newCaption);
		onUpdate({ ...content, caption: newCaption });
	};

	const handleLayoutChange = (newLayout: "inline" | "centered" | "full-width") => {
		setLayout(newLayout);
		onUpdate({ ...content, layout: newLayout });
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Upload file
		const formData = new FormData();
		formData.append("file", file);
		formData.append("type", "image");
		formData.append("altText", altText);

		try {
			const response = await fetch("/api/media/upload", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				const data = await response.json();
				onUpdate({ ...content, mediaId: data.id, altText: data.altText || altText });
			}
		} catch (error) {
			console.error("Failed to upload image:", error);
		}
	};

	return (
		<div className="image-block">
			{content.mediaId ? (
				<div className="image-preview">
					<img src={content.mediaId} alt={altText} />
					<div className="image-controls">
						<label>
							Alt text (required):
							<input
								type="text"
								value={altText}
								onChange={(e) => handleAltTextChange(e.target.value)}
								placeholder="Describe the image"
								required
							/>
						</label>
						<label>
							Caption (optional):
							<input
								type="text"
								value={caption}
								onChange={(e) => handleCaptionChange(e.target.value)}
								placeholder="Image caption"
							/>
						</label>
						<label>
							Layout:
							<select
								value={layout}
								onChange={(e) =>
									handleLayoutChange(
										e.target.value as "inline" | "centered" | "full-width",
									)
								}
							>
								<option value="inline">Inline</option>
								<option value="centered">Centered</option>
								<option value="full-width">Full Width</option>
							</select>
						</label>
					</div>
				</div>
			) : (
				<div className="image-upload">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={handleFileSelect}
						className="file-input"
					/>
					<p>Upload an image (JPG, PNG, or WEBP)</p>
				</div>
			)}
		</div>
	);
}
