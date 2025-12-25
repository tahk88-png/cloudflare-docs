/**
 * Heading Block Component
 */

import { useState, useEffect, useRef } from "react";
import type { HeadingBlockContent } from "~/lib/content-creation/types";
import "../../blocks/block-styles.css";

export interface HeadingBlockProps {
	content: HeadingBlockContent;
	onUpdate: (content: HeadingBlockContent) => void;
}

export function HeadingBlock({ content, onUpdate }: HeadingBlockProps) {
	const [text, setText] = useState(content.text);
	const [level, setLevel] = useState(content.level);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setText(content.text);
		setLevel(content.level);
	}, [content]);

	const handleTextChange = (newText: string) => {
		setText(newText);
		onUpdate({ ...content, text: newText });
	};

	const handleLevelChange = (newLevel: 1 | 2 | 3 | 4) => {
		setLevel(newLevel);
		onUpdate({ ...content, level: newLevel });
	};

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [text]);

	return (
		<div className="heading-block">
			<div className="heading-controls">
				<select
					value={level}
					onChange={(e) =>
						handleLevelChange(Number(e.target.value) as 1 | 2 | 3 | 4)
					}
					className="heading-level-select"
				>
					<option value={1}>H1</option>
					<option value={2}>H2</option>
					<option value={3}>H3</option>
					<option value={4}>H4</option>
				</select>
			</div>
			<textarea
				ref={textareaRef}
				value={text}
				onChange={(e) => handleTextChange(e.target.value)}
				placeholder="Enter heading text..."
				className="heading-input"
				rows={1}
			/>
		</div>
	);
}
