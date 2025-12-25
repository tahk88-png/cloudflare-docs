/**
 * Media Library Component
 * 
 * Shows available media assets and allows selection
 */

import { useState, useEffect } from "react";
import type { MediaAsset } from "~/lib/content-creation/types";
import "./media-library.css";

export interface MediaLibraryProps {
	onClose: () => void;
	onSelectMedia: (media: MediaAsset) => void;
}

export function MediaLibrary({ onClose, onSelectMedia }: MediaLibraryProps) {
	const [assets, setAssets] = useState<MediaAsset[]>([]);
	const [filter, setFilter] = useState<"all" | "image" | "video">("all");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadAssets();
	}, [filter]);

	const loadAssets = async () => {
		setIsLoading(true);
		try {
			const url =
				filter === "all"
					? "/api/media"
					: `/api/media?type=${filter}`;
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();
				setAssets(data.assets || []);
			}
		} catch (error) {
			console.error("Failed to load media:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("file", file);
		formData.append("type", "image");

		try {
			const response = await fetch("/api/media/upload", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				loadAssets();
			}
		} catch (error) {
			console.error("Failed to upload:", error);
		}
	};

	return (
		<div className="media-library">
			<div className="media-library-header">
				<h3>Media Library</h3>
				<button className="close-btn" onClick={onClose}>
					×
				</button>
			</div>

			<div className="media-library-controls">
				<div className="filter-tabs">
					<button
						className={filter === "all" ? "active" : ""}
						onClick={() => setFilter("all")}
					>
						All
					</button>
					<button
						className={filter === "image" ? "active" : ""}
						onClick={() => setFilter("image")}
					>
						Images
					</button>
					<button
						className={filter === "video" ? "active" : ""}
						onClick={() => setFilter("video")}
					>
						Videos
					</button>
				</div>
				<div className="upload-controls">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={handleUpload}
						className="file-input"
						id="media-upload"
					/>
					<label htmlFor="media-upload" className="upload-btn">
						Upload Image
					</label>
				</div>
			</div>

			{isLoading ? (
				<div className="loading">Loading...</div>
			) : (
				<div className="media-grid">
					{assets.map((asset) => (
						<div
							key={asset.id}
							className="media-item"
							onClick={() => onSelectMedia(asset)}
						>
							{asset.type === "image" ? (
								<img src={asset.url} alt={asset.altText || ""} />
							) : (
								<div className="video-thumbnail">
									{asset.thumbnailUrl ? (
										<img src={asset.thumbnailUrl} alt={asset.altText || ""} />
									) : (
										<div className="video-placeholder">Video</div>
									)}
									<div className="play-icon">▶</div>
								</div>
							)}
							<div className="media-item-info">
								{asset.altText && <p>{asset.altText}</p>}
							</div>
						</div>
					))}
					{assets.length === 0 && (
						<div className="empty-state">No media found</div>
					)}
				</div>
			)}
		</div>
	);
}
