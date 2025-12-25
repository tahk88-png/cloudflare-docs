import { useState } from "react";
import type { NewsletterBlock } from "~/lib/db/types";

interface AITextAssistantProps {
	newsletterId: number;
	blocks: NewsletterBlock[];
	onBlocksChange: (blocks: NewsletterBlock[]) => void;
}

export function AITextAssistant({
	newsletterId,
	blocks,
	onBlocksChange,
}: AITextAssistantProps) {
	const [action, setAction] = useState<string>("improve-clarity");
	const [tone, setTone] = useState<string>("");
	const [targetAudience, setTargetAudience] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [improvedBlocks, setImprovedBlocks] = useState<NewsletterBlock[] | null>(
		null,
	);
	const [selectedBlockIds, setSelectedBlockIds] = useState<number[]>([]);

	const actions = [
		{ value: "improve-clarity", label: "Improve Clarity" },
		{ value: "shorten", label: "Shorten" },
		{ value: "make-persuasive", label: "Make More Persuasive" },
		{ value: "make-friendly", label: "Make More Friendly" },
		{ value: "make-professional", label: "Make More Professional" },
		{ value: "fix-grammar", label: "Fix Grammar & Spelling" },
		{ value: "improve-cta", label: "Improve CTA" },
		{ value: "highlight-offer", label: "Highlight Offer" },
	];

	const textBlocks = blocks.filter(
		(b) => b.type === "paragraph" || b.type === "heading",
	);

	const handleImprove = async () => {
		setLoading(true);
		setImprovedBlocks(null);

		try {
			const response = await fetch(
				`/api/newsletters/${newsletterId}/improve-text`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action,
						tone: tone || undefined,
						targetAudience: targetAudience || undefined,
						blockIds:
							selectedBlockIds.length > 0 ? selectedBlockIds : undefined,
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Failed to improve text");
			}

			const data = await response.json();
			setImprovedBlocks(data.blocks);
		} catch (error) {
			console.error("Failed to improve text:", error);
			alert("Failed to improve text. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const acceptImprovements = () => {
		if (improvedBlocks) {
			onBlocksChange(improvedBlocks);
			setImprovedBlocks(null);
		}
	};

	const rejectImprovements = () => {
		setImprovedBlocks(null);
	};

	return (
		<div className="p-4 space-y-4">
			<h2 className="text-lg font-semibold text-gray-900">AI Text Assistant</h2>

			{textBlocks.length === 0 && (
				<div className="text-sm text-gray-500">
					Add some text blocks to improve them with AI.
				</div>
			)}

			{textBlocks.length > 0 && (
				<>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Action
						</label>
						<select
							value={action}
							onChange={(e) => setAction(e.target.value)}
							className="w-full border border-gray-300 rounded-md px-3 py-2"
						>
							{actions.map((a) => (
								<option key={a.value} value={a.value}>
									{a.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Tone (optional)
						</label>
						<input
							type="text"
							value={tone}
							onChange={(e) => setTone(e.target.value)}
							className="w-full border border-gray-300 rounded-md px-3 py-2"
							placeholder="e.g., professional, casual, friendly"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Target Audience (optional)
						</label>
						<input
							type="text"
							value={targetAudience}
							onChange={(e) => setTargetAudience(e.target.value)}
							className="w-full border border-gray-300 rounded-md px-3 py-2"
							placeholder="e.g., business owners, developers"
						/>
					</div>

					{textBlocks.length > 1 && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Blocks (optional - leave empty for all)
							</label>
							<div className="space-y-2 max-h-32 overflow-y-auto">
								{textBlocks.map((block) => {
									const content = JSON.parse(block.content);
									const preview = content.text?.substring(0, 50) || "";
									return (
										<label
											key={block.id}
											className="flex items-center gap-2 text-sm"
										>
											<input
												type="checkbox"
												checked={selectedBlockIds.includes(block.id)}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedBlockIds([
															...selectedBlockIds,
															block.id,
														]);
													} else {
														setSelectedBlockIds(
															selectedBlockIds.filter((id) => id !== block.id),
														);
													}
												}}
											/>
											<span className="text-gray-600">
												{block.type === "heading" ? "H" : "P"}: {preview}
												{preview.length >= 50 ? "..." : ""}
											</span>
										</label>
									);
								})}
							</div>
						</div>
					)}

					<button
						onClick={handleImprove}
						disabled={loading}
						className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? "Improving..." : "Improve Text"}
					</button>

					{improvedBlocks && (
						<div className="border border-gray-200 rounded-lg p-4 space-y-3">
							<div className="flex items-center justify-between">
								<h3 className="font-medium text-gray-900">Preview Changes</h3>
								<div className="flex gap-2">
									<button
										onClick={acceptImprovements}
										className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
									>
										Accept
									</button>
									<button
										onClick={rejectImprovements}
										className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
									>
										Reject
									</button>
								</div>
							</div>
							<div className="text-sm text-gray-600 space-y-2">
								{improvedBlocks.map((block, index) => {
									const content = JSON.parse(block.content);
									if (block.type === "paragraph" || block.type === "heading") {
										return (
											<div key={index} className="border-l-2 border-blue-500 pl-2">
												{content.text}
											</div>
										);
									}
									return null;
								})}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
