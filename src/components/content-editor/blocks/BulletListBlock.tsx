/**
 * Bullet List Block Component
 */

import { useState, useEffect } from "react";
import type { BulletListBlockContent } from "~/lib/content-creation/types";

export interface BulletListBlockProps {
	content: BulletListBlockContent;
	onUpdate: (content: BulletListBlockContent) => void;
}

export function BulletListBlock({ content, onUpdate }: BulletListBlockProps) {
	const [items, setItems] = useState(content.items);

	useEffect(() => {
		setItems(content.items);
	}, [content]);

	const handleItemChange = (index: number, value: string) => {
		const newItems = [...items];
		newItems[index] = value;
		setItems(newItems);
		onUpdate({ ...content, items: newItems });
	};

	const handleAddItem = () => {
		const newItems = [...items, ""];
		setItems(newItems);
		onUpdate({ ...content, items: newItems });
	};

	const handleRemoveItem = (index: number) => {
		if (items.length > 1) {
			const newItems = items.filter((_, i) => i !== index);
			setItems(newItems);
			onUpdate({ ...content, items: newItems });
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (index === items.length - 1) {
				handleAddItem();
			}
		}
		if (e.key === "Backspace" && items[index] === "" && items.length > 1) {
			e.preventDefault();
			handleRemoveItem(index);
		}
	};

	return (
		<div className="bullet-list-block">
			{items.map((item, index) => (
				<div key={index} className="list-item">
					<span className="bullet">•</span>
					<input
						type="text"
						value={item}
						onChange={(e) => handleItemChange(index, e.target.value)}
						onKeyDown={(e) => handleKeyDown(e, index)}
						placeholder="List item"
						className="list-item-input"
					/>
					{items.length > 1 && (
						<button
							className="remove-item-btn"
							onClick={() => handleRemoveItem(index)}
						>
							×
						</button>
					)}
				</div>
			))}
			<button className="add-item-btn" onClick={handleAddItem}>
				+ Add item
			</button>
		</div>
	);
}
