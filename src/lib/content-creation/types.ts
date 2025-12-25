/**
 * Content Creation System - Type Definitions
 * 
 * Core data models for documents, blocks, media, versions, and AI operations
 */

export type BlockType =
	| "heading"
	| "paragraph"
	| "bullet-list"
	| "image"
	| "video"
	| "cta"
	| "divider";

export type HeadingLevel = 1 | 2 | 3 | 4;

export type Tone =
	| "neutral"
	| "professional"
	| "friendly"
	| "confident"
	| "short-direct";

export type LengthPreference = "shorter" | "same" | "longer";

export type TargetAudience =
	| "private-customer"
	| "business-customer"
	| "existing-user"
	| "new-lead";

export type AITextAction =
	| "improve-clarity"
	| "shorten"
	| "expand"
	| "make-professional"
	| "make-friendly"
	| "make-persuasive"
	| "fix-grammar"
	| "improve-cta"
	| "highlight-key-message"
	| "simplify-language";

export type MediaType = "image" | "video";

export type ImageLayout = "inline" | "centered" | "full-width";

export type VideoSource = "youtube" | "vimeo" | "self-hosted";

export type PreviewMode = "web" | "email" | "mobile";

// Block Content Types
export interface HeadingBlockContent {
	type: "heading";
	level: HeadingLevel;
	text: string;
}

export interface ParagraphBlockContent {
	type: "paragraph";
	text: string;
	links?: Array<{
		text: string;
		url: string;
		startIndex: number;
		endIndex: number;
	}>;
}

export interface BulletListBlockContent {
	type: "bullet-list";
	items: string[];
}

export interface ImageBlockContent {
	type: "image";
	mediaId: string;
	altText: string;
	caption?: string;
	layout: ImageLayout;
}

export interface VideoBlockContent {
	type: "video";
	mediaId: string;
	source: VideoSource;
	videoUrl: string;
	thumbnailUrl?: string;
	title?: string;
	layout: "centered" | "full-width";
}

export interface CTABlockContent {
	type: "cta";
	text: string;
	url: string;
	style: "button" | "link";
}

export interface DividerBlockContent {
	type: "divider";
}

export type BlockContent =
	| HeadingBlockContent
	| ParagraphBlockContent
	| BulletListBlockContent
	| ImageBlockContent
	| VideoBlockContent
	| CTABlockContent
	| DividerBlockContent;

export interface DocumentBlock {
	id: string;
	documentId: string;
	type: BlockType;
	content: BlockContent;
	order: number;
	createdAt: string;
	updatedAt: string;
}

export interface Document {
	id: string;
	title: string;
	language: string;
	createdAt: string;
	updatedAt: string;
}

export interface MediaAsset {
	id: string;
	type: MediaType;
	url: string;
	thumbnailUrl?: string;
	altText?: string;
	createdAt: string;
}

export interface DocumentVersion {
	id: string;
	documentId: string;
	snapshotJson: string; // JSON string of blocks array
	createdAt: string;
}

export interface AIEditLog {
	id: string;
	documentId: string;
	action: AITextAction;
	tone?: Tone;
	language: string;
	originalText: string;
	improvedText: string;
	changeSummary: string;
	createdAt: string;
}

// API Request/Response Types
export interface CreateDocumentRequest {
	title: string;
	language: string;
}

export interface UpdateDocumentRequest {
	title?: string;
	language?: string;
}

export interface ImproveTextRequest {
	blockId: string;
	text: string;
	action: AITextAction;
	tone?: Tone;
	length?: LengthPreference;
	targetAudience?: TargetAudience;
	language: string;
}

export interface ImproveTextResponse {
	improvedText: string;
	changeSummary: string;
}

export interface UploadMediaRequest {
	type: MediaType;
	file?: File; // For image uploads
	url?: string; // For video links
	altText?: string;
}

export interface UploadMediaResponse {
	id: string;
	type: MediaType;
	url: string;
	thumbnailUrl?: string;
	altText?: string;
}

export interface SuggestMediaPlacementRequest {
	documentId: string;
	blockId: string;
	context: string; // Surrounding text
}

export interface SuggestMediaPlacementResponse {
	suggestion: string;
	recommendedType?: MediaType;
	recommendedPosition?: "before" | "after";
}

export interface PreviewRequest {
	documentId: string;
	mode: PreviewMode;
}

export interface PreviewResponse {
	html: string;
	warnings: Array<{
		type: "missing-alt-text" | "oversized-image" | "long-paragraph" | "video-thumbnail";
		blockId: string;
		message: string;
	}>;
}

// Editor State Types
export interface EditorState {
	document: Document;
	blocks: DocumentBlock[];
	isDirty: boolean;
	lastSavedAt?: string;
	currentVersionId?: string;
}

export interface BlockDragState {
	draggedBlockId: string;
	targetBlockId?: string;
	position?: "before" | "after";
}
