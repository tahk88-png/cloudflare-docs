/**
 * Preview Panel Component
 * 
 * Shows document preview in different modes (web, email, mobile)
 */

import { useState, useEffect } from "react";
import type { PreviewMode } from "~/lib/content-creation/types";
import "./preview-panel.css";

export interface PreviewPanelProps {
	documentId: string;
	mode: PreviewMode;
	onClose: () => void;
}

export function PreviewPanel({
	documentId,
	mode,
	onClose,
}: PreviewPanelProps) {
	const [html, setHtml] = useState<string>("");
	const [warnings, setWarnings] = useState<
		Array<{ type: string; blockId: string; message: string }>
	>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		loadPreview();
	}, [documentId, mode]);

	const loadPreview = async () => {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/documents/${documentId}/preview`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mode }),
			});

			if (response.ok) {
				const data = await response.json();
				setHtml(data.html || "");
				setWarnings(data.warnings || []);
			}
		} catch (error) {
			console.error("Failed to load preview:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="preview-panel">
			<div className="preview-panel-header">
				<h3>Preview ({mode})</h3>
				<button className="close-btn" onClick={onClose}>
					×
				</button>
			</div>

			{warnings.length > 0 && (
				<div className="preview-warnings">
					<h4>Warnings:</h4>
					<ul>
						{warnings.map((warning, index) => (
							<li key={index}>{warning.message}</li>
						))}
					</ul>
				</div>
			)}

			{isLoading ? (
				<div className="loading">Generating preview...</div>
			) : (
				<div
					className={`preview-content preview-${mode}`}
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			)}
		</div>
	);
}
