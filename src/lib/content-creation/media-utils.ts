/**
 * Media Processing Utilities
 * 
 * Handles image optimization, video processing, and media validation
 */

import type { MediaType, VideoSource } from "./types";

export interface ImageOptimizationOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	format?: "jpg" | "png" | "webp";
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
	const validTypes = ["image/jpeg", "image/png", "image/webp"];
	const maxSize = 10 * 1024 * 1024; // 10MB

	if (!validTypes.includes(file.type)) {
		return {
			valid: false,
			error: "Invalid image type. Please use JPG, PNG, or WEBP.",
		};
	}

	if (file.size > maxSize) {
		return {
			valid: false,
			error: "Image is too large. Maximum size is 10MB.",
		};
	}

	return { valid: true };
}

/**
 * Optimize image (client-side preview)
 * In production, this should be done server-side
 */
export async function optimizeImage(
	file: File,
	options: ImageOptimizationOptions = {},
): Promise<Blob> {
	const {
		maxWidth = 1920,
		maxHeight = 1080,
		quality = 0.85,
		format = "webp",
	} = options;

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				let width = img.width;
				let height = img.height;

				// Calculate new dimensions
				if (width > maxWidth || height > maxHeight) {
					const ratio = Math.min(maxWidth / width, maxHeight / height);
					width = width * ratio;
					height = height * ratio;
				}

				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext("2d");
				if (!ctx) {
					reject(new Error("Could not get canvas context"));
					return;
				}

				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error("Failed to create blob"));
						}
					},
					`image/${format}`,
					quality,
				);
			};
			img.onerror = () => reject(new Error("Failed to load image"));
			img.src = e.target?.result as string;
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
		/youtube\.com\/watch\?.*v=([^&\n?#]+)/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	return null;
}

/**
 * Extract video ID from Vimeo URL
 */
export function extractVimeoId(url: string): string | null {
	const patterns = [
		/(?:vimeo\.com\/)(\d+)/,
		/vimeo\.com\/video\/(\d+)/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	return null;
}

/**
 * Detect video source type from URL
 */
export function detectVideoSource(url: string): VideoSource | null {
	if (extractYouTubeId(url)) {
		return "youtube";
	}
	if (extractVimeoId(url)) {
		return "vimeo";
	}
	if (url.match(/\.(mp4|webm)$/i)) {
		return "self-hosted";
	}
	return null;
}

/**
 * Generate YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
	return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Generate Vimeo embed URL
 */
export function getVimeoEmbedUrl(videoId: string): string {
	return `https://player.vimeo.com/video/${videoId}`;
}

/**
 * Generate YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
	return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Generate Vimeo thumbnail URL (requires API call in production)
 */
export function getVimeoThumbnailUrl(videoId: string): string {
	// Vimeo requires API call for thumbnail
	// For now, return placeholder
	return `https://vumbnail.com/${videoId}.jpg`;
}

/**
 * Validate video URL
 */
export function validateVideoUrl(url: string): {
	valid: boolean;
	source?: VideoSource;
	videoId?: string;
	error?: string;
} {
	const source = detectVideoSource(url);

	if (!source) {
		return {
			valid: false,
			error: "Invalid video URL. Please use YouTube, Vimeo, or a direct MP4/WEBM link.",
		};
	}

	let videoId: string | null = null;
	if (source === "youtube") {
		videoId = extractYouTubeId(url);
	} else if (source === "vimeo") {
		videoId = extractVimeoId(url);
	}

	return {
		valid: true,
		source,
		videoId: videoId || undefined,
	};
}

/**
 * Check if image is oversized for email
 */
export function isOversizedForEmail(width: number, height: number): boolean {
	// Email clients typically handle images up to 600px wide well
	return width > 600;
}

/**
 * Generate responsive image srcset
 */
export function generateSrcSet(
	baseUrl: string,
	widths: number[] = [400, 800, 1200, 1920],
): string {
	return widths.map((w) => `${baseUrl}?w=${w} ${w}w`).join(", ");
}
