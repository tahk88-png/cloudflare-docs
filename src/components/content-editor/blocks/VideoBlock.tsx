/**
 * Video Block Component
 */

import { useState, useEffect } from "react";
import type { VideoBlockContent } from "~/lib/content-creation/types";
import {
	detectVideoSource,
	validateVideoUrl,
} from "~/lib/content-creation/media-utils";

export interface VideoBlockProps {
	content: VideoBlockContent;
	onUpdate: (content: VideoBlockContent) => void;
}

export function VideoBlock({ content, onUpdate }: VideoBlockProps) {
	const [videoUrl, setVideoUrl] = useState(content.videoUrl);
	const [title, setTitle] = useState(content.title || "");
	const [layout, setLayout] = useState(content.layout);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setVideoUrl(content.videoUrl);
		setTitle(content.title || "");
		setLayout(content.layout);
	}, [content]);

	const handleUrlChange = async (newUrl: string) => {
		setVideoUrl(newUrl);
		setError(null);

		if (!newUrl) {
			onUpdate({ ...content, videoUrl: "" });
			return;
		}

		const validation = validateVideoUrl(newUrl);
		if (!validation.valid) {
			setError(validation.error);
			return;
		}

		// Link video via API
		try {
			const response = await fetch("/api/media/link-video", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: newUrl, title }),
			});

			if (response.ok) {
				const data = await response.json();
				const source = detectVideoSource(newUrl) || "youtube";
				onUpdate({
					...content,
					mediaId: data.id,
					videoUrl: newUrl,
					source,
					thumbnailUrl: data.thumbnailUrl,
					title,
				});
			} else {
				setError("Failed to link video");
			}
		} catch (err) {
			setError("Failed to link video");
		}
	};

	const handleTitleChange = (newTitle: string) => {
		setTitle(newTitle);
		onUpdate({ ...content, title: newTitle });
	};

	const handleLayoutChange = (newLayout: "centered" | "full-width") => {
		setLayout(newLayout);
		onUpdate({ ...content, layout: newLayout });
	};

	return (
		<div className="video-block">
			<label>
				Video URL (YouTube, Vimeo, or MP4/WEBM):
				<input
					type="url"
					value={videoUrl}
					onChange={(e) => handleUrlChange(e.target.value)}
					placeholder="https://youtube.com/watch?v=..."
					className="video-url-input"
				/>
			</label>
			{error && <div className="error-message">{error}</div>}
			{content.thumbnailUrl && (
				<div className="video-preview">
					<img src={content.thumbnailUrl} alt={title || "Video thumbnail"} />
				</div>
			)}
			<label>
				Title (optional):
				<input
					type="text"
					value={title}
					onChange={(e) => handleTitleChange(e.target.value)}
					placeholder="Video title"
				/>
			</label>
			<label>
				Layout:
				<select
					value={layout}
					onChange={(e) =>
						handleLayoutChange(e.target.value as "centered" | "full-width")
					}
				>
					<option value="centered">Centered</option>
					<option value="full-width">Full Width</option>
				</select>
			</label>
		</div>
	);
}
