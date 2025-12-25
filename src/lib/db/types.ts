// Database types for Newsletter system

export interface SenderProfile {
	id: number;
	name: string;
	email: string;
	reply_to: string | null;
	is_default: boolean;
	created_at: string;
	updated_at: string;
}

export interface Newsletter {
	id: number;
	subject: string;
	preheader: string | null;
	body_html: string;
	body_text: string | null;
	sender_id: number | null;
	status: "draft" | "scheduled" | "sent";
	created_at: string;
	updated_at: string;
}

export interface NewsletterBlock {
	id: number;
	newsletter_id: number;
	type: "heading" | "paragraph" | "list" | "image" | "link";
	content: string; // JSON string
	order_index: number;
	created_at: string;
}

export interface NewsletterImage {
	id: number;
	file_url: string;
	file_name: string;
	alt_text: string | null;
	width: number | null;
	height: number | null;
	file_size: number | null;
	created_at: string;
}

export interface NewsletterVersion {
	id: number;
	newsletter_id: number;
	content_snapshot: string; // JSON string
	created_at: string;
}

export interface NewsletterAILog {
	id: number;
	newsletter_id: number;
	action: string;
	tone: string | null;
	original_text: string;
	improved_text: string;
	created_at: string;
}

// Block content types
export interface HeadingBlockContent {
	level: 1 | 2 | 3 | 4 | 5 | 6;
	text: string;
}

export interface ParagraphBlockContent {
	text: string;
}

export interface ListBlockContent {
	items: string[];
	ordered: boolean;
}

export interface ImageBlockContent {
	image_id: number;
	alt_text: string;
	alignment: "left" | "center" | "right";
	size: "small" | "medium" | "full-width";
	caption: string | null;
}

export interface LinkBlockContent {
	url: string;
	text: string;
}

export type BlockContent =
	| HeadingBlockContent
	| ParagraphBlockContent
	| ListBlockContent
	| ImageBlockContent
	| LinkBlockContent;
