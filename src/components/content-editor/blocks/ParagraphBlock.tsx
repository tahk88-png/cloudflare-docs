/**
 * Paragraph Block Component
 */

import { useState, useEffect, useRef } from "react";
import type { ParagraphBlockContent } from "~/lib/content-creation/types";

export interface ParagraphBlockProps {
	content: ParagraphBlockContent;
	onUpdate: (content: ParagraphBlockContent) => void;
}

export function ParagraphBlock({ content, onUpdate }: ParagraphBlockProps) {
	const [text, setText] = useState(content.text);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setText(content.text);
	}, [content]);

	const handleTextChange = (newText: string) => {
		setText(newText);
		onUpdate({ ...content, text: newText });
	};

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [text]);

	return (
		<div className="paragraph-block">
			<textarea
				ref={textareaRef}
				value={text}
				onChange={(e) => handleTextChange(e.target.value)}
				placeholder="Start typing..."
				className="paragraph-input"
				rows={3}
			/>
		</div>
	);
}
