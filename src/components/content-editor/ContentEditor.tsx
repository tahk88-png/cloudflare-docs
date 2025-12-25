/**
 * Main Content Editor Component
 * 
 * Block-based editor with drag & drop, AI assistance, and media support
 */

import { useState, useEffect, useCallback } from "react";
import type {
	Document,
	DocumentBlock,
	BlockType,
	EditorState,
} from "~/lib/content-creation/types";
import { BlockList } from "./BlockList";
import { Toolbar } from "./Toolbar";
import { AIPanel } from "./AIPanel";
import { MediaLibrary } from "./MediaLibrary";
import { PreviewPanel } from "./PreviewPanel";
import "./editor.css";
import "./blocks/block-styles.css";

export interface ContentEditorProps {
	documentId: string;
	initialDocument?: Document;
	initialBlocks?: DocumentBlock[];
	onSave?: (document: Document, blocks: DocumentBlock[]) => Promise<void>;
	onAutoSave?: (document: Document, blocks: DocumentBlock[]) => Promise<void>;
}

export function ContentEditor({
	documentId,
	initialDocument,
	initialBlocks = [],
	onSave,
	onAutoSave,
}: ContentEditorProps) {
	const [document, setDocument] = useState<Document>(
		initialDocument || {
			id: documentId,
			title: "",
			language: "et",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	);
	const [blocks, setBlocks] = useState<DocumentBlock[]>(initialBlocks);
	const [isDirty, setIsDirty] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [showAIPanel, setShowAIPanel] = useState(false);
	const [showMediaLibrary, setShowMediaLibrary] = useState(false);
	const [showPreview, setShowPreview] = useState(false);
	const [previewMode, setPreviewMode] = useState<"web" | "email" | "mobile">("web");
	const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

	// Auto-save effect
	useEffect(() => {
		if (!isDirty || !onAutoSave) return;

		const timer = setTimeout(() => {
			onAutoSave(document, blocks);
			setIsDirty(false);
			setLastSavedAt(new Date());
		}, 2000); // Auto-save after 2 seconds of inactivity

		return () => clearTimeout(timer);
	}, [document, blocks, isDirty, onAutoSave]);

	// Load document and blocks on mount
	useEffect(() => {
		if (documentId && !initialDocument && initialBlocks.length === 0) {
			loadDocument();
		}
	}, [documentId]);

	const loadDocument = async () => {
		try {
			const response = await fetch(`/api/documents/${documentId}`);
			if (response.ok) {
				const data = await response.json();
				setDocument(data.document);
				setBlocks(data.blocks || []);
			} else if (response.status === 404) {
				// Document doesn't exist, create it
				const newDoc: Document = {
					id: documentId,
					title: "Untitled Document",
					language: "et",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
				setDocument(newDoc);
			}
		} catch (error) {
			console.error("Failed to load document:", error);
		}
	};

	const handleSave = async () => {
		if (!onSave) return;

		try {
			await onSave(document, blocks);
			setIsDirty(false);
			setLastSavedAt(new Date());
		} catch (error) {
			console.error("Failed to save:", error);
		}
	};

	const handleAddBlock = (type: BlockType, afterBlockId?: string) => {
		const newBlock: DocumentBlock = createEmptyBlock(type);
		const insertIndex = afterBlockId
			? blocks.findIndex((b) => b.id === afterBlockId) + 1
			: blocks.length;

		const newBlocks = [...blocks];
		newBlocks.splice(insertIndex, 0, newBlock);

		// Reorder blocks
		const reorderedBlocks = newBlocks.map((block, index) => ({
			...block,
			order: index,
		}));

		setBlocks(reorderedBlocks);
		setIsDirty(true);
		setSelectedBlockId(newBlock.id);
	};

	const handleUpdateBlock = (blockId: string, content: any) => {
		setBlocks((prev) =>
			prev.map((block) =>
				block.id === blockId
					? { ...block, content, updatedAt: new Date().toISOString() }
					: block,
			),
		);
		setIsDirty(true);
	};

	// Listen for AI improvement events
	useEffect(() => {
		const handleApplyAI = (event: CustomEvent) => {
			const { blockId, improvedText } = event.detail;
			const block = blocks.find((b) => b.id === blockId);
			if (block) {
				if (block.content.type === "heading") {
					handleUpdateBlock(blockId, { ...block.content, text: improvedText });
				} else if (block.content.type === "paragraph") {
					handleUpdateBlock(blockId, { ...block.content, text: improvedText });
				} else if (block.content.type === "cta") {
					handleUpdateBlock(blockId, { ...block.content, text: improvedText });
				}
			}
		};

		window.addEventListener("apply-ai-improvement", handleApplyAI as EventListener);
		return () => {
			window.removeEventListener("apply-ai-improvement", handleApplyAI as EventListener);
		};
	}, [blocks]);

	const handleDeleteBlock = (blockId: string) => {
		setBlocks((prev) => {
			const filtered = prev.filter((block) => block.id !== blockId);
			return filtered.map((block, index) => ({ ...block, order: index }));
		});
		setIsDirty(true);
	};

	const handleReorderBlocks = (reorderedBlocks: DocumentBlock[]) => {
		const withOrder = reorderedBlocks.map((block, index) => ({
			...block,
			order: index,
		}));
		setBlocks(withOrder);
		setIsDirty(true);
	};

	const handleUpdateDocument = (updates: Partial<Document>) => {
		setDocument((prev) => ({
			...prev,
			...updates,
			updatedAt: new Date().toISOString(),
		}));
		setIsDirty(true);
	};

	const createEmptyBlock = (type: BlockType): DocumentBlock => {
		const now = new Date().toISOString();
		const id = crypto.randomUUID();

		switch (type) {
			case "heading":
				return {
					id,
					documentId,
					type: "heading",
					content: { type: "heading", level: 2, text: "" },
					order: blocks.length,
					createdAt: now,
					updatedAt: now,
				};
			case "paragraph":
				return {
					id,
					documentId,
					type: "paragraph",
					content: { type: "paragraph", text: "" },
					order: blocks.length,
					createdAt: now,
					updatedAt: now,
				};
			case "bullet-list":
				return {
					id,
					documentId,
					type: "bullet-list",
					content: { type: "bullet-list", items: [""] },
					order: blocks.length,
					createdAt: now,
					updatedAt: now,
				};
			case "image":
				return {
					id,
					documentId,
					type: "image",
					content: {
						type: "image",
						mediaId: "",
						altText: "",
						layout: "inline",
					},
					order: blocks.length,
					createdAt: now,
					updatedAt: now,
				};
			case "video":
				return {
					id,
					documentId,
					type: "video",
					content: {
						type: "video",
						mediaId: "",
						source: "youtube",
						videoUrl: "",
						layout: "centered",
					},
					order: blocks.length,
					createdAt: now,
					updatedAt: now,
				};
			case "cta":
				return {
					id,
					documentId,
					type: "cta",
					content: {
						type: "cta",
						text: "",
						url: "",
						style: "button",
					},
					order: blocks.length,
					createdAt: now,
					updatedAt: now,
				};
			case "divider":
				return {
					id,
					documentId,
					type: "divider",
					content: { type: "divider" },
					order: blocks.length,
					createdAt: now,
					updatedAt: now,
				};
		}
	};

	return (
		<div className="content-editor">
			<Toolbar
				document={document}
				isDirty={isDirty}
				lastSavedAt={lastSavedAt}
				onSave={handleSave}
				onUpdateDocument={handleUpdateDocument}
				onAddBlock={handleAddBlock}
				onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
				onToggleMediaLibrary={() => setShowMediaLibrary(!showMediaLibrary)}
				onTogglePreview={() => setShowPreview(!showPreview)}
				previewMode={previewMode}
				onPreviewModeChange={setPreviewMode}
			/>

			<div className="editor-layout">
				<div className="editor-main">
					<BlockList
						blocks={blocks}
						selectedBlockId={selectedBlockId}
						onSelectBlock={setSelectedBlockId}
						onUpdateBlock={handleUpdateBlock}
						onDeleteBlock={handleDeleteBlock}
						onAddBlock={handleAddBlock}
						onReorderBlocks={handleReorderBlocks}
					/>
				</div>

				{showAIPanel && (
					<AIPanel
						selectedBlockId={selectedBlockId}
						blocks={blocks}
						documentLanguage={document.language}
						onClose={() => setShowAIPanel(false)}
					/>
				)}

				{showMediaLibrary && (
					<MediaLibrary
						onClose={() => setShowMediaLibrary(false)}
						onSelectMedia={(media) => {
							// Handle media selection
							setShowMediaLibrary(false);
						}}
					/>
				)}

				{showPreview && (
					<PreviewPanel
						documentId={documentId}
						mode={previewMode}
						onClose={() => setShowPreview(false)}
					/>
				)}
			</div>
		</div>
	);
}
