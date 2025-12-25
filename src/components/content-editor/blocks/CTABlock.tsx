/**
 * CTA Block Component
 */

import { useState, useEffect } from "react";
import type { CTABlockContent } from "~/lib/content-creation/types";

export interface CTABlockProps {
	content: CTABlockContent;
	onUpdate: (content: CTABlockContent) => void;
}

export function CTABlock({ content, onUpdate }: CTABlockProps) {
	const [text, setText] = useState(content.text);
	const [url, setUrl] = useState(content.url);
	const [style, setStyle] = useState(content.style);

	useEffect(() => {
		setText(content.text);
		setUrl(content.url);
		setStyle(content.style);
	}, [content]);

	const handleTextChange = (newText: string) => {
		setText(newText);
		onUpdate({ ...content, text: newText });
	};

	const handleUrlChange = (newUrl: string) => {
		setUrl(newUrl);
		onUpdate({ ...content, url: newUrl });
	};

	const handleStyleChange = (newStyle: "button" | "link") => {
		setStyle(newStyle);
		onUpdate({ ...content, style: newStyle });
	};

	return (
		<div className="cta-block">
			<label>
				CTA Text:
				<input
					type="text"
					value={text}
					onChange={(e) => handleTextChange(e.target.value)}
					placeholder="Click here"
				/>
			</label>
			<label>
				URL:
				<input
					type="url"
					value={url}
					onChange={(e) => handleUrlChange(e.target.value)}
					placeholder="https://example.com"
				/>
			</label>
			<label>
				Style:
				<select
					value={style}
					onChange={(e) => handleStyleChange(e.target.value as "button" | "link")}
				>
					<option value="button">Button</option>
					<option value="link">Link</option>
				</select>
			</label>
			<div className="cta-preview">
				{style === "button" ? (
					<button className="btn-preview">{text || "Button"}</button>
				) : (
					<a href={url || "#"} className="link-preview">
						{text || "Link"}
					</a>
				)}
			</div>
		</div>
	);
}
