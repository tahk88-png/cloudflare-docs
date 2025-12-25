/**
 * Toolbar Component
 * 
 * Main editor toolbar with document controls and block insertion
 */

import { useState } from "react";
import type { Document, BlockType } from "~/lib/content-creation/types";
import "./toolbar.css";

export interface ToolbarProps {
	document: Document;
	isDirty: boolean;
	lastSavedAt: Date | null;
	onSave: () => void;
	onUpdateDocument: (updates: Partial<Document>) => void;
	onAddBlock: (type: BlockType) => void;
	onToggleAIPanel: () => void;
	onToggleMediaLibrary: () => void;
	onTogglePreview: () => void;
	previewMode: "web" | "email" | "mobile";
	onPreviewModeChange: (mode: "web" | "email" | "mobile") => void;
}

export function Toolbar({
	document,
	isDirty,
	lastSavedAt,
	onSave,
	onUpdateDocument,
	onAddBlock,
	onToggleAIPanel,
	onToggleMediaLibrary,
	onTogglePreview,
	previewMode,
	onPreviewModeChange,
}: ToolbarProps) {
	const [showBlockMenu, setShowBlockMenu] = useState(false);

	const blockTypes: Array<{ type: BlockType; label: string; icon?: string }> = [
		{ type: "heading", label: "Heading" },
		{ type: "paragraph", label: "Paragraph" },
		{ type: "bullet-list", label: "Bullet List" },
		{ type: "image", label: "Image" },
		{ type: "video", label: "Video" },
		{ type: "cta", label: "Call to Action" },
		{ type: "divider", label: "Divider" },
	];

	return (
		<div className="toolbar">
			<div className="toolbar-left">
				<input
					type="text"
					value={document.title}
					onChange={(e) => onUpdateDocument({ title: e.target.value })}
					placeholder="Document title"
					className="document-title-input"
				/>
				<select
					value={document.language}
					onChange={(e) => onUpdateDocument({ language: e.target.value })}
					className="language-select"
				>
					<option value="et">Estonian</option>
					<option value="en">English</option>
					<option value="lv">Latvian</option>
					<option value="lt">Lithuanian</option>
				</select>
			</div>

			<div className="toolbar-center">
				<div className="block-menu">
					<button
						className="add-block-btn"
						onClick={() => setShowBlockMenu(!showBlockMenu)}
					>
						+ Add Block
					</button>
					{showBlockMenu && (
						<div className="block-menu-dropdown">
							{blockTypes.map(({ type, label }) => (
								<button
									key={type}
									className="block-menu-item"
									onClick={() => {
										onAddBlock(type);
										setShowBlockMenu(false);
									}}
								>
									{label}
								</button>
							))}
						</div>
					)}
				</div>
			</div>

			<div className="toolbar-right">
				<button className="toolbar-btn" onClick={onToggleAIPanel}>
					AI Assist
				</button>
				<button className="toolbar-btn" onClick={onToggleMediaLibrary}>
					Media Library
				</button>
				<div className="preview-controls">
					<button className="toolbar-btn" onClick={onTogglePreview}>
						Preview
					</button>
					<select
						value={previewMode}
						onChange={(e) =>
							onPreviewModeChange(
								e.target.value as "web" | "email" | "mobile",
							)
						}
						className="preview-mode-select"
					>
						<option value="web">Web</option>
						<option value="email">Email</option>
						<option value="mobile">Mobile</option>
					</select>
				</div>
				<button
					className="save-btn"
					onClick={onSave}
					disabled={!isDirty}
				>
					{isDirty ? "Save" : "Saved"}
				</button>
				{lastSavedAt && (
					<span className="last-saved">
						Saved {lastSavedAt.toLocaleTimeString()}
					</span>
				)}
			</div>
		</div>
	);
}
