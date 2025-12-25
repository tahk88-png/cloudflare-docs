/**
 * Block Component
 * 
 * Individual block with editing capabilities
 */

import { useState } from "react";
import type { DocumentBlock, BlockContent } from "~/lib/content-creation/types";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { ParagraphBlock } from "./blocks/ParagraphBlock";
import { BulletListBlock } from "./blocks/BulletListBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { VideoBlock } from "./blocks/VideoBlock";
import { CTABlock } from "./blocks/CTABlock";
import { DividerBlock } from "./blocks/DividerBlock";
import "./block.css";

export interface BlockProps {
	block: DocumentBlock;
	isSelected: boolean;
	isDragging: boolean;
	onSelect: () => void;
	onUpdate: (content: BlockContent) => void;
	onDelete: () => void;
	onAddAfter: (type: any) => void;
	onDragStart: () => void;
}

export function Block({
	block,
	isSelected,
	isDragging,
	onSelect,
	onUpdate,
	onDelete,
	onAddAfter,
	onDragStart,
}: BlockProps) {
	const [isHovered, setIsHovered] = useState(false);

	const renderBlock = () => {
		switch (block.content.type) {
			case "heading":
				return (
					<HeadingBlock
						content={block.content}
						onUpdate={(content) => onUpdate(content)}
					/>
				);
			case "paragraph":
				return (
					<ParagraphBlock
						content={block.content}
						onUpdate={(content) => onUpdate(content)}
					/>
				);
			case "bullet-list":
				return (
					<BulletListBlock
						content={block.content}
						onUpdate={(content) => onUpdate(content)}
					/>
				);
			case "image":
				return (
					<ImageBlock
						content={block.content}
						onUpdate={(content) => onUpdate(content)}
					/>
				);
			case "video":
				return (
					<VideoBlock
						content={block.content}
						onUpdate={(content) => onUpdate(content)}
					/>
				);
			case "cta":
				return (
					<CTABlock
						content={block.content}
						onUpdate={(content) => onUpdate(content)}
					/>
				);
			case "divider":
				return <DividerBlock />;
			default:
				return <div>Unknown block type</div>;
		}
	};

	return (
		<div
			className={`block ${isSelected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
			onClick={onSelect}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			draggable
			onDragStart={onDragStart}
		>
			{(isSelected || isHovered) && (
				<div className="block-controls">
					<button
						className="block-control-btn"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						title="Delete block"
					>
						×
					</button>
					<div
						className="block-drag-handle"
						title="Drag to reorder"
					>
						⋮⋮
					</div>
				</div>
			)}
			<div className="block-content">{renderBlock()}</div>
		</div>
	);
}
