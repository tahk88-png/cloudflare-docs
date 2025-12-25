/**
 * Block List Component
 * 
 * Renders blocks with drag & drop reordering
 */

import { useState } from "react";
import type { DocumentBlock } from "~/lib/content-creation/types";
import { Block } from "./Block";
import "./block-list.css";

export interface BlockListProps {
	blocks: DocumentBlock[];
	selectedBlockId: string | null;
	onSelectBlock: (blockId: string | null) => void;
	onUpdateBlock: (blockId: string, content: any) => void;
	onDeleteBlock: (blockId: string) => void;
	onAddBlock: (type: any, afterBlockId?: string) => void;
	onReorderBlocks: (blocks: DocumentBlock[]) => void;
}

export function BlockList({
	blocks,
	selectedBlockId,
	onSelectBlock,
	onUpdateBlock,
	onDeleteBlock,
	onAddBlock,
	onReorderBlocks,
}: BlockListProps) {
	const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
	const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
	const [dragPosition, setDragPosition] = useState<"before" | "after" | null>(
		null,
	);

	const handleDragStart = (blockId: string) => {
		setDraggedBlockId(blockId);
	};

	const handleDragOver = (
		e: React.DragEvent,
		blockId: string,
		position: "before" | "after",
	) => {
		e.preventDefault();
		setDragOverBlockId(blockId);
		setDragPosition(position);
	};

	const handleDragLeave = () => {
		setDragOverBlockId(null);
		setDragPosition(null);
	};

	const handleDrop = (targetBlockId: string) => {
		if (!draggedBlockId || draggedBlockId === targetBlockId) {
			setDraggedBlockId(null);
			setDragOverBlockId(null);
			setDragPosition(null);
			return;
		}

		const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId);
		const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);

		if (draggedIndex === -1 || targetIndex === -1) {
			setDraggedBlockId(null);
			setDragOverBlockId(null);
			setDragPosition(null);
			return;
		}

		const newBlocks = [...blocks];
		const [draggedBlock] = newBlocks.splice(draggedIndex, 1);

		// Insert at target position
		const insertIndex =
			dragPosition === "before" ? targetIndex : targetIndex + 1;
		newBlocks.splice(insertIndex, 0, draggedBlock);

		onReorderBlocks(newBlocks);

		setDraggedBlockId(null);
		setDragOverBlockId(null);
		setDragPosition(null);
	};

	return (
		<div className="block-list">
			{blocks.length === 0 && (
				<div className="empty-state">
					<p>Start by adding a block</p>
				</div>
			)}

			{blocks.map((block, index) => (
				<div key={block.id} className="block-wrapper">
					{/* Drop zone before block */}
					<div
						className={`drop-zone drop-zone-before ${
							dragOverBlockId === block.id && dragPosition === "before"
								? "active"
								: ""
						}`}
						onDragOver={(e) => handleDragOver(e, block.id, "before")}
						onDragLeave={handleDragLeave}
						onDrop={() => handleDrop(block.id)}
					/>

					<Block
						block={block}
						isSelected={selectedBlockId === block.id}
						isDragging={draggedBlockId === block.id}
						onSelect={() => onSelectBlock(block.id)}
						onUpdate={(content) => onUpdateBlock(block.id, content)}
						onDelete={() => onDeleteBlock(block.id)}
						onAddAfter={(type) => onAddBlock(type, block.id)}
						onDragStart={() => handleDragStart(block.id)}
					/>

					{/* Drop zone after block */}
					{index === blocks.length - 1 && (
						<div
							className={`drop-zone drop-zone-after ${
								dragOverBlockId === block.id && dragPosition === "after"
									? "active"
									: ""
							}`}
							onDragOver={(e) => handleDragOver(e, block.id, "after")}
							onDragLeave={handleDragLeave}
							onDrop={() => handleDrop(block.id)}
						/>
					)}
				</div>
			))}
		</div>
	);
}
