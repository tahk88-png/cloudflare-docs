import { useState } from "react";
import type { NewsletterBlock, NewsletterImage } from "~/lib/db/types";
import { BlockItem } from "./BlockItem";

interface BlockEditorProps {
	blocks: NewsletterBlock[];
	onChange: (blocks: NewsletterBlock[]) => void;
	images: NewsletterImage[];
}

export function BlockEditor({ blocks, onChange, images }: BlockEditorProps) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

	const addBlock = (type: NewsletterBlock["type"]) => {
		const newBlock: NewsletterBlock = {
			id: Date.now(), // Temporary ID
			newsletter_id: 0,
			type,
			content: getDefaultContent(type),
			order_index: blocks.length,
			created_at: new Date().toISOString(),
		};

		onChange([...blocks, newBlock]);
	};

	const updateBlock = (index: number, block: NewsletterBlock) => {
		const newBlocks = [...blocks];
		newBlocks[index] = block;
		onChange(newBlocks);
	};

	const deleteBlock = (index: number) => {
		const newBlocks = blocks.filter((_, i) => i !== index);
		// Reorder indices
		newBlocks.forEach((block, i) => {
			block.order_index = i;
		});
		onChange(newBlocks);
	};

	const moveBlock = (fromIndex: number, toIndex: number) => {
		const newBlocks = [...blocks];
		const [removed] = newBlocks.splice(fromIndex, 1);
		newBlocks.splice(toIndex, 0, removed);
		// Reorder indices
		newBlocks.forEach((block, i) => {
			block.order_index = i;
		});
		onChange(newBlocks);
	};

	const handleDragStart = (index: number) => {
		setDraggedIndex(index);
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;

		moveBlock(draggedIndex, index);
		setDraggedIndex(index);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
	};

	return (
		<div className="space-y-4">
			{blocks.map((block, index) => (
				<div
					key={block.id || index}
					draggable
					onDragStart={() => handleDragStart(index)}
					onDragOver={(e) => handleDragOver(e, index)}
					onDragEnd={handleDragEnd}
					className={`cursor-move ${
						draggedIndex === index ? "opacity-50" : ""
					}`}
				>
					<BlockItem
						block={block}
						onChange={(updatedBlock) => updateBlock(index, updatedBlock)}
						onDelete={() => deleteBlock(index)}
						images={images}
					/>
				</div>
			))}

			{/* Add Block Menu */}
			<div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
				<div className="flex flex-wrap gap-2">
					<button
						onClick={() => addBlock("heading")}
						className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
					>
						+ Heading
					</button>
					<button
						onClick={() => addBlock("paragraph")}
						className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
					>
						+ Paragraph
					</button>
					<button
						onClick={() => addBlock("list")}
						className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
					>
						+ List
					</button>
					<button
						onClick={() => addBlock("image")}
						className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
					>
						+ Image
					</button>
					<button
						onClick={() => addBlock("link")}
						className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
					>
						+ Link
					</button>
				</div>
			</div>
		</div>
	);
}

function getDefaultContent(type: NewsletterBlock["type"]): string {
	switch (type) {
		case "heading":
			return JSON.stringify({ level: 2, text: "" });
		case "paragraph":
			return JSON.stringify({ text: "" });
		case "list":
			return JSON.stringify({ items: [""], ordered: false });
		case "image":
			return JSON.stringify({
				image_id: 0,
				alt_text: "",
				alignment: "center",
				size: "medium",
				caption: null,
			});
		case "link":
			return JSON.stringify({ url: "", text: "" });
		default:
			return JSON.stringify({});
	}
}
