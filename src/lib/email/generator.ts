// Email HTML generator - creates email-safe HTML
// Uses tables and inline styles for maximum compatibility

import type { Newsletter, NewsletterBlock, NewsletterImage } from "../db/types";

export interface EmailOptions {
	newsletter: Newsletter;
	blocks: NewsletterBlock[];
	images: NewsletterImage[];
	senderProfile?: {
		name: string;
		email: string;
		reply_to?: string | null;
	};
}

export function generateEmailHTML(options: EmailOptions): string {
	const { newsletter, blocks, images, senderProfile } = options;

	// Create image map for quick lookup
	const imageMap = new Map(images.map((img) => [img.id, img]));

	// Build body content from blocks
	const bodyContent = blocks
		.sort((a, b) => a.order_index - b.order_index)
		.map((block) => renderBlock(block, imageMap))
		.join("");

	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>${escapeHtml(newsletter.subject)}</title>
	<!--[if mso]>
	<style type="text/css">
		table { border-collapse: collapse; }
	</style>
	<![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
		<tr>
			<td align="center" style="padding: 20px 0;">
				<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 30px 40px 20px 40px;">
							<h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
								${escapeHtml(newsletter.subject)}
							</h1>
							${newsletter.preheader ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #666666; line-height: 1.5;">${escapeHtml(newsletter.preheader)}</p>` : ""}
						</td>
					</tr>
					<!-- Body Content -->
					<tr>
						<td style="padding: 0 40px 30px 40px;">
							${bodyContent}
						</td>
					</tr>
					<!-- Footer -->
					${senderProfile ? `
					<tr>
						<td style="padding: 20px 40px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999999;">
							<p style="margin: 0;">From: ${escapeHtml(senderProfile.name)} &lt;${escapeHtml(senderProfile.email)}&gt;</p>
							${senderProfile.reply_to ? `<p style="margin: 5px 0 0 0;">Reply to: ${escapeHtml(senderProfile.reply_to)}</p>` : ""}
						</td>
					</tr>
					` : ""}
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;

	return html;
}

function renderBlock(
	block: NewsletterBlock,
	imageMap: Map<number, NewsletterImage>,
): string {
	const content = JSON.parse(block.content);

	switch (block.type) {
		case "heading": {
			const { level, text } = content;
			return `<h${level} style="margin: 24px 0 12px 0; font-size: ${getHeadingSize(level)}px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
				${escapeHtml(text)}
			</h${level}>`;
		}

		case "paragraph": {
			const { text } = content;
			return `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #333333;">
				${escapeHtml(text)}
			</p>`;
		}

		case "list": {
			const { items, ordered } = content;
			const tag = ordered ? "ol" : "ul";
			const itemsHtml = items
				.map(
					(item: string) =>
						`<li style="margin: 8px 0; font-size: 16px; line-height: 1.6; color: #333333;">${escapeHtml(item)}</li>`,
				)
				.join("");
			return `<${tag} style="margin: 0 0 16px 0; padding-left: 24px;">
				${itemsHtml}
			</${tag}>`;
		}

		case "image": {
			const { image_id, alt_text, alignment, size, caption } = content;
			const image = imageMap.get(image_id);
			if (!image) return "";

			const width = getImageWidth(size);
			const alignStyle = alignment === "center" ? "center" : alignment === "right" ? "right" : "left";

			return `
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
				<tr>
					<td align="${alignStyle}">
						<img src="${escapeHtml(image.file_url)}" alt="${escapeHtml(alt_text || image.alt_text || "")}" width="${width}" style="max-width: 100%; height: auto; display: block; border-radius: 4px;" />
						${caption ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #666666; text-align: ${alignStyle};">${escapeHtml(caption)}</p>` : ""}
					</td>
				</tr>
			</table>`;
		}

		case "link": {
			const { url, text } = content;
			return `<p style="margin: 0 0 16px 0;">
				<a href="${escapeHtml(url)}" style="color: #0066cc; text-decoration: underline;">${escapeHtml(text)}</a>
			</p>`;
		}

		default:
			return "";
	}
}

function getHeadingSize(level: number): number {
	const sizes: Record<number, number> = {
		1: 32,
		2: 28,
		3: 24,
		4: 20,
		5: 18,
		6: 16,
	};
	return sizes[level] || 20;
}

function getImageWidth(size: string): number {
	const widths: Record<string, number> = {
		small: 150,
		medium: 400,
		"full-width": 600,
	};
	return widths[size] || 400;
}

function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function generatePlainText(
	newsletter: Newsletter,
	blocks: NewsletterBlock[],
): string {
	const lines: string[] = [];

	lines.push(newsletter.subject);
	if (newsletter.preheader) {
		lines.push(newsletter.preheader);
	}
	lines.push("");
	lines.push("─".repeat(50));
	lines.push("");

	blocks
		.sort((a, b) => a.order_index - b.order_index)
		.forEach((block) => {
			const content = JSON.parse(block.content);

			switch (block.type) {
				case "heading":
					lines.push(content.text);
					lines.push("");
					break;
				case "paragraph":
					lines.push(content.text);
					lines.push("");
					break;
				case "list":
					content.items.forEach((item: string, index: number) => {
						const prefix = content.ordered ? `${index + 1}. ` : "- ";
						lines.push(`${prefix}${item}`);
					});
					lines.push("");
					break;
				case "image":
					lines.push(`[Image: ${content.alt_text || "Image"}]`);
					if (content.caption) {
						lines.push(content.caption);
					}
					lines.push("");
					break;
				case "link":
					lines.push(`${content.text}: ${content.url}`);
					lines.push("");
					break;
			}
		});

	return lines.join("\n");
}
