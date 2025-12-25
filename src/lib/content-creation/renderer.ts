/**
 * Block Renderer
 * 
 * Converts document blocks to HTML for preview
 */

import type {
	DocumentBlock,
	PreviewMode,
	BlockContent,
	ImageBlockContent,
	VideoBlockContent,
} from "./types";
import {
	getYouTubeEmbedUrl,
	getVimeoEmbedUrl,
	isOversizedForEmail,
} from "./media-utils";

export interface RenderResult {
	html: string;
	warnings: Array<{
		type: "missing-alt-text" | "oversized-image" | "long-paragraph" | "video-thumbnail";
		blockId: string;
		message: string;
	}>;
}

export async function renderBlocksToHTML(
	blocks: DocumentBlock[],
	mode: PreviewMode = "web",
): Promise<RenderResult> {
	const warnings: RenderResult["warnings"] = [];
	const htmlParts: string[] = [];

	for (const block of blocks) {
		const rendered = await renderBlock(block, mode, warnings);
		htmlParts.push(rendered);
	}

	return {
		html: htmlParts.join("\n"),
		warnings,
	};
}

async function renderBlock(
	block: DocumentBlock,
	mode: PreviewMode,
	warnings: RenderResult["warnings"],
): Promise<string> {
	const { content } = block;

	switch (content.type) {
		case "heading":
			return `<h${content.level}>${escapeHtml(content.text)}</h${content.level}>`;

		case "paragraph":
			let text = escapeHtml(content.text);
			
			// Add links if present
			if (content.links && content.links.length > 0) {
				// Sort links by start index (reverse order to avoid index shifting)
				const sortedLinks = [...content.links].sort(
					(a, b) => b.startIndex - a.startIndex,
				);
				
				for (const link of sortedLinks) {
					const before = text.substring(0, link.startIndex);
					const linkText = escapeHtml(link.text);
					const after = text.substring(link.endIndex);
					text = `${before}<a href="${escapeHtml(link.url)}">${linkText}</a>${after}`;
				}
			}

			// Check for long paragraphs (email warning)
			if (mode === "email" && content.text.length > 500) {
				warnings.push({
					type: "long-paragraph",
					blockId: block.id,
					message: "Paragraph is quite long for email. Consider breaking it up.",
				});
			}

			return `<p>${text}</p>`;

		case "bullet-list":
			const items = content.items
				.map((item) => `  <li>${escapeHtml(item)}</li>`)
				.join("\n");
			return `<ul>\n${items}\n</ul>`;

		case "image":
			const imageContent = content as ImageBlockContent;
			
			if (!imageContent.altText) {
				warnings.push({
					type: "missing-alt-text",
					blockId: block.id,
					message: "Image is missing alt text",
				});
			}

			let imgTag = `<img src="${escapeHtml(imageContent.mediaId)}" alt="${escapeHtml(imageContent.altText || "")}"`;
			
			// Add layout classes
			const layoutClass = getImageLayoutClass(imageContent.layout, mode);
			if (layoutClass) {
				imgTag += ` class="${layoutClass}"`;
			}

			imgTag += " />";

			// Check for oversized images in email
			if (mode === "email") {
				// Note: In production, you'd check actual image dimensions
				warnings.push({
					type: "oversized-image",
					blockId: block.id,
					message: "Ensure image width is 600px or less for email compatibility",
				});
			}

			let imageHtml = imgTag;
			if (imageContent.caption) {
				imageHtml = `<figure>${imgTag}<figcaption>${escapeHtml(imageContent.caption)}</figcaption></figure>`;
			}

			return wrapWithLayout(imageHtml, imageContent.layout, mode);

		case "video":
			const videoContent = content as VideoBlockContent;
			
			if (mode === "email") {
				// Email: Show thumbnail with play button
				warnings.push({
					type: "video-thumbnail",
					blockId: block.id,
					message: "Video will be shown as thumbnail in email. Click opens in browser.",
				});

				const thumbnailUrl = videoContent.thumbnailUrl || "";
				const videoHtml = `
<div class="video-thumbnail" style="text-align: center; margin: 20px 0;">
  <a href="${escapeHtml(videoContent.videoUrl)}" style="display: inline-block; position: relative;">
    <img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(videoContent.title || "Video")}" style="max-width: 100%; height: auto;" />
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(0,0,0,0.7); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 24px;">▶</span>
    </div>
  </a>
  ${videoContent.title ? `<p style="margin-top: 10px;">${escapeHtml(videoContent.title)}</p>` : ""}
</div>`;
				return wrapWithLayout(videoHtml, videoContent.layout, mode);
			}

			// Web: Embed video
			let embedUrl = "";
			if (videoContent.source === "youtube") {
				const videoId = extractVideoId(videoContent.videoUrl, "youtube");
				if (videoId) {
					embedUrl = getYouTubeEmbedUrl(videoId);
				}
			} else if (videoContent.source === "vimeo") {
				const videoId = extractVideoId(videoContent.videoUrl, "vimeo");
				if (videoId) {
					embedUrl = getVimeoEmbedUrl(videoId);
				}
			}

			if (embedUrl) {
				const videoHtml = `
<div class="video-embed">
  <iframe src="${escapeHtml(embedUrl)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width: 100%; max-width: 800px; height: 450px;"></iframe>
  ${videoContent.title ? `<p>${escapeHtml(videoContent.title)}</p>` : ""}
</div>`;
				return wrapWithLayout(videoHtml, videoContent.layout, mode);
			}

			// Self-hosted video
			const selfHostedHtml = `
<video controls style="width: 100%; max-width: 800px;">
  <source src="${escapeHtml(videoContent.videoUrl)}" type="video/mp4">
  Your browser does not support the video tag.
</video>
${videoContent.title ? `<p>${escapeHtml(videoContent.title)}</p>` : ""}`;
			return wrapWithLayout(selfHostedHtml, videoContent.layout, mode);

		case "cta":
			if (content.style === "button") {
				return `<div class="cta-button"><a href="${escapeHtml(content.url)}" class="btn">${escapeHtml(content.text)}</a></div>`;
			}
			return `<div class="cta-link"><a href="${escapeHtml(content.url)}">${escapeHtml(content.text)}</a></div>`;

		case "divider":
			return `<hr />`;

		default:
			return "";
	}
}

function escapeHtml(text: string): string {
	const div = typeof document !== "undefined" 
		? document.createElement("div")
		: null;
	if (div) {
		div.textContent = text;
		return div.innerHTML;
	}
	// Server-side fallback
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function getImageLayoutClass(
	layout: string,
	mode: PreviewMode,
): string {
	if (mode === "email") {
		// Email: simpler layout options
		return layout === "centered" ? "center" : "";
	}

	switch (layout) {
		case "centered":
			return "image-centered";
		case "full-width":
			return "image-full-width";
		default:
			return "image-inline";
	}
}

function wrapWithLayout(
	html: string,
	layout: string,
	mode: PreviewMode,
): string {
	if (mode === "email") {
		// Email: use inline styles
		if (layout === "centered") {
			return `<div style="text-align: center; margin: 20px 0;">${html}</div>`;
		}
		if (layout === "full-width") {
			return `<div style="width: 100%; margin: 20px 0;">${html}</div>`;
		}
		return html;
	}

	// Web: use CSS classes
	if (layout === "centered") {
		return `<div class="content-centered">${html}</div>`;
	}
	if (layout === "full-width") {
		return `<div class="content-full-width">${html}</div>`;
	}
	return html;
}

function extractVideoId(url: string, source: "youtube" | "vimeo"): string | null {
	if (source === "youtube") {
		const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
		return match ? match[1] : null;
	}
	if (source === "vimeo") {
		const match = url.match(/(?:vimeo\.com\/)(\d+)/);
		return match ? match[1] : null;
	}
	return null;
}
