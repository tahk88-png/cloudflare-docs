/**
 * AI Panel Component
 * 
 * Provides AI text improvement controls
 */

import { useState } from "react";
import type {
	DocumentBlock,
	AITextAction,
	Tone,
	LengthPreference,
	TargetAudience,
} from "~/lib/content-creation/types";
import "./ai-panel.css";

export interface AIPanelProps {
	selectedBlockId: string | null;
	blocks: DocumentBlock[];
	documentLanguage: string;
	onClose: () => void;
}

export function AIPanel({
	selectedBlockId,
	blocks,
	documentLanguage,
	onClose,
}: AIPanelProps) {
	const [action, setAction] = useState<AITextAction>("improve-clarity");
	const [tone, setTone] = useState<Tone | undefined>(undefined);
	const [length, setLength] = useState<LengthPreference | undefined>(undefined);
	const [targetAudience, setTargetAudience] = useState<
		TargetAudience | undefined
	>(undefined);
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<{
		improvedText: string;
		changeSummary: string;
	} | null>(null);

	const selectedBlock = selectedBlockId
		? blocks.find((b) => b.id === selectedBlockId)
		: null;

	const canImprove =
		selectedBlock &&
		(selectedBlock.content.type === "paragraph" ||
			selectedBlock.content.type === "heading" ||
			selectedBlock.content.type === "cta");

	const getTextFromBlock = (block: DocumentBlock): string => {
		if (block.content.type === "heading") {
			return block.content.text;
		}
		if (block.content.type === "paragraph") {
			return block.content.text;
		}
		if (block.content.type === "cta") {
			return block.content.text;
		}
		return "";
	};

	const handleImprove = async () => {
		if (!selectedBlock || !canImprove) return;

		setIsProcessing(true);
		setResult(null);

		try {
			const text = getTextFromBlock(selectedBlock);
			const response = await fetch(
				`/api/documents/${selectedBlock.documentId}/improve-text`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						blockId: selectedBlock.id,
						text,
						action,
						tone,
						length,
						targetAudience,
						language: documentLanguage,
					}),
				},
			);

			if (response.ok) {
				const data = await response.json();
				setResult(data);
			} else {
				throw new Error("Failed to improve text");
			}
		} catch (error) {
			console.error("AI improvement error:", error);
			alert("Failed to improve text. Please try again.");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleApply = () => {
		if (!selectedBlock || !result) return;

		// This would be handled by parent component
		// For now, we'll dispatch an event or use a callback
		const event = new CustomEvent("apply-ai-improvement", {
			detail: {
				blockId: selectedBlock.id,
				improvedText: result.improvedText,
			},
		});
		window.dispatchEvent(event);

		setResult(null);
	};

	return (
		<div className="ai-panel">
			<div className="ai-panel-header">
				<h3>AI Text Improvement</h3>
				<button className="close-btn" onClick={onClose}>
					×
				</button>
			</div>

			{!canImprove && (
				<div className="ai-panel-message">
					Select a text block (heading, paragraph, or CTA) to improve it.
				</div>
			)}

			{canImprove && (
				<div className="ai-panel-content">
					<div className="ai-controls">
						<label>
							Action:
							<select
								value={action}
								onChange={(e) => setAction(e.target.value as AITextAction)}
							>
								<option value="improve-clarity">Improve clarity</option>
								<option value="shorten">Shorten</option>
								<option value="expand">Expand</option>
								<option value="make-professional">Make professional</option>
								<option value="make-friendly">Make friendly</option>
								<option value="make-persuasive">Make persuasive</option>
								<option value="fix-grammar">Fix grammar</option>
								<option value="improve-cta">Improve CTA</option>
								<option value="highlight-key-message">
									Highlight key message
								</option>
								<option value="simplify-language">Simplify language</option>
							</select>
						</label>

						<label>
							Tone (optional):
							<select
								value={tone || ""}
								onChange={(e) =>
									setTone(
										e.target.value ? (e.target.value as Tone) : undefined,
									)
								}
							>
								<option value="">Default</option>
								<option value="neutral">Neutral & clear</option>
								<option value="professional">Professional</option>
								<option value="friendly">Friendly</option>
								<option value="confident">Confident</option>
								<option value="short-direct">Short & direct</option>
							</select>
						</label>

						<label>
							Length (optional):
							<select
								value={length || ""}
								onChange={(e) =>
									setLength(
										e.target.value
											? (e.target.value as LengthPreference)
											: undefined,
									)
								}
							>
								<option value="">Same length</option>
								<option value="shorter">Shorter</option>
								<option value="longer">Longer</option>
							</select>
						</label>

						<label>
							Target audience (optional):
							<select
								value={targetAudience || ""}
								onChange={(e) =>
									setTargetAudience(
										e.target.value
											? (e.target.value as TargetAudience)
											: undefined,
									)
								}
							>
								<option value="">General</option>
								<option value="private-customer">Private customer</option>
								<option value="business-customer">Business customer</option>
								<option value="existing-user">Existing user</option>
								<option value="new-lead">New lead</option>
							</select>
						</label>
					</div>

					<div className="ai-original-text">
						<strong>Original:</strong>
						<p>{getTextFromBlock(selectedBlock!)}</p>
					</div>

					<button
						className="improve-btn"
						onClick={handleImprove}
						disabled={isProcessing}
					>
						{isProcessing ? "Processing..." : "Improve Text"}
					</button>

					{result && (
						<div className="ai-result">
							<strong>Improved:</strong>
							<p>{result.improvedText}</p>
							<strong>Changes:</strong>
							<p className="change-summary">{result.changeSummary}</p>
							<div className="ai-result-actions">
								<button className="apply-btn" onClick={handleApply}>
									Apply Changes
								</button>
								<button
									className="cancel-btn"
									onClick={() => setResult(null)}
								>
									Cancel
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
