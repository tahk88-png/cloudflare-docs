import { useState } from "react";
import type { NewsletterBlock, NewsletterImage } from "~/lib/db/types";

interface BlockItemProps {
	block: NewsletterBlock;
	onChange: (block: NewsletterBlock) => void;
	onDelete: () => void;
	images: NewsletterImage[];
}

export function BlockItem({
	block,
	onChange,
	onDelete,
	images,
}: BlockItemProps) {
	const content = JSON.parse(block.content);

	const updateContent = (newContent: any) => {
		onChange({
			...block,
			content: JSON.stringify(newContent),
		});
	};

	switch (block.type) {
		case "heading":
			return (
				<div className="group relative border border-gray-200 rounded-lg p-4 hover:border-gray-300">
					<div className="flex items-center justify-between mb-2">
						<select
							value={content.level}
							onChange={(e) =>
								updateContent({ ...content, level: parseInt(e.target.value) })
							}
							className="text-sm border border-gray-300 rounded px-2 py-1"
						>
							<option value={1}>H1</option>
							<option value={2}>H2</option>
							<option value={3}>H3</option>
							<option value={4}>H4</option>
							<option value={5}>H5</option>
							<option value={6}>H6</option>
						</select>
						<button
							onClick={onDelete}
							className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm"
						>
							Delete
						</button>
					</div>
					<input
						type="text"
						value={content.text}
						onChange={(e) => updateContent({ ...content, text: e.target.value })}
						className="w-full text-lg font-semibold border-none outline-none"
						placeholder="Enter heading..."
					/>
				</div>
			);

		case "paragraph":
			return (
				<div className="group relative border border-gray-200 rounded-lg p-4 hover:border-gray-300">
					<div className="flex justify-end mb-2">
						<button
							onClick={onDelete}
							className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm"
						>
							Delete
						</button>
					</div>
					<textarea
						value={content.text}
						onChange={(e) => updateContent({ ...content, text: e.target.value })}
						className="w-full min-h-[100px] border-none outline-none resize-none"
						placeholder="Enter paragraph text..."
					/>
				</div>
			);

		case "list":
			return (
				<div className="group relative border border-gray-200 rounded-lg p-4 hover:border-gray-300">
					<div className="flex items-center justify-between mb-2">
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={content.ordered}
								onChange={(e) =>
									updateContent({ ...content, ordered: e.target.checked })
								}
							/>
							<span className="text-sm">Ordered list</span>
						</label>
						<button
							onClick={onDelete}
							className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm"
						>
							Delete
						</button>
					</div>
					<div className="space-y-2">
						{content.items.map((item: string, index: number) => (
							<div key={index} className="flex items-center gap-2">
								<span className="text-gray-400">
									{content.ordered ? `${index + 1}.` : "•"}
								</span>
								<input
									type="text"
									value={item}
									onChange={(e) => {
										const newItems = [...content.items];
										newItems[index] = e.target.value;
										updateContent({ ...content, items: newItems });
									}}
									className="flex-1 border-none outline-none"
									placeholder="List item..."
								/>
								{content.items.length > 1 && (
									<button
										onClick={() => {
											const newItems = content.items.filter(
												(_: string, i: number) => i !== index,
											);
											updateContent({ ...content, items: newItems });
										}}
										className="text-red-600 hover:text-red-700 text-sm"
									>
										Remove
									</button>
								)}
							</div>
						))}
						<button
							onClick={() => {
								updateContent({
									...content,
									items: [...content.items, ""],
								});
							}}
							className="text-sm text-blue-600 hover:text-blue-700"
						>
							+ Add item
						</button>
					</div>
				</div>
			);

		case "image":
			const selectedImage = images.find((img) => img.id === content.image_id);
			return (
				<div className="group relative border border-gray-200 rounded-lg p-4 hover:border-gray-300">
					<div className="flex justify-end mb-2">
						<button
							onClick={onDelete}
							className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm"
						>
							Delete
						</button>
					</div>
					<div className="space-y-3">
						<select
							value={content.image_id || ""}
							onChange={(e) =>
								updateContent({
									...content,
									image_id: parseInt(e.target.value) || 0,
								})
							}
							className="w-full border border-gray-300 rounded px-3 py-2"
						>
							<option value="">Select image...</option>
							{images.map((img) => (
								<option key={img.id} value={img.id}>
									{img.file_name}
								</option>
							))}
						</select>

						{selectedImage && (
							<div className="border border-gray-200 rounded p-2">
								<img
									src={selectedImage.file_url}
									alt={selectedImage.alt_text || ""}
									className="max-w-full h-auto rounded"
								/>
							</div>
						)}

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs text-gray-600 mb-1">
									Alignment
								</label>
								<select
									value={content.alignment}
									onChange={(e) =>
										updateContent({ ...content, alignment: e.target.value })
									}
									className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
								>
									<option value="left">Left</option>
									<option value="center">Center</option>
									<option value="right">Right</option>
								</select>
							</div>
							<div>
								<label className="block text-xs text-gray-600 mb-1">Size</label>
								<select
									value={content.size}
									onChange={(e) =>
										updateContent({ ...content, size: e.target.value })
									}
									className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
								>
									<option value="small">Small</option>
									<option value="medium">Medium</option>
									<option value="full-width">Full Width</option>
								</select>
							</div>
						</div>

						<div>
							<label className="block text-xs text-gray-600 mb-1">
								Alt Text
							</label>
							<input
								type="text"
								value={content.alt_text || ""}
								onChange={(e) =>
									updateContent({ ...content, alt_text: e.target.value })
								}
								className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
								placeholder="Image description..."
							/>
						</div>

						<div>
							<label className="block text-xs text-gray-600 mb-1">
								Caption (optional)
							</label>
							<input
								type="text"
								value={content.caption || ""}
								onChange={(e) =>
									updateContent({ ...content, caption: e.target.value || null })
								}
								className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
								placeholder="Image caption..."
							/>
						</div>
					</div>
				</div>
			);

		case "link":
			return (
				<div className="group relative border border-gray-200 rounded-lg p-4 hover:border-gray-300">
					<div className="flex justify-end mb-2">
						<button
							onClick={onDelete}
							className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-sm"
						>
							Delete
						</button>
					</div>
					<div className="space-y-2">
						<input
							type="text"
							value={content.text}
							onChange={(e) => updateContent({ ...content, text: e.target.value })}
							className="w-full border border-gray-300 rounded px-3 py-2"
							placeholder="Link text..."
						/>
						<input
							type="url"
							value={content.url}
							onChange={(e) => updateContent({ ...content, url: e.target.value })}
							className="w-full border border-gray-300 rounded px-3 py-2"
							placeholder="https://example.com"
						/>
					</div>
				</div>
			);

		default:
			return null;
	}
}
