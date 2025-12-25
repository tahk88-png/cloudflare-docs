import { useState } from "react";

interface PreviewPanelProps {
	newsletterId: number;
}

export function PreviewPanel({ newsletterId }: PreviewPanelProps) {
	const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
	const [showPreview, setShowPreview] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string>("");

	const openPreview = () => {
		const url = `/api/newsletters/${newsletterId}/preview`;
		setPreviewUrl(url);
		setShowPreview(true);
	};

	return (
		<div>
			<button
				onClick={openPreview}
				className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
			>
				Preview Newsletter
			</button>

			{showPreview && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
						<div className="flex items-center justify-between p-4 border-b border-gray-200">
							<h2 className="text-lg font-semibold">Preview</h2>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setPreviewMode("desktop")}
									className={`px-3 py-1 text-sm rounded ${
										previewMode === "desktop"
											? "bg-blue-600 text-white"
											: "bg-gray-100 text-gray-700"
									}`}
								>
									Desktop
								</button>
								<button
									onClick={() => setPreviewMode("mobile")}
									className={`px-3 py-1 text-sm rounded ${
										previewMode === "mobile"
											? "bg-blue-600 text-white"
											: "bg-gray-100 text-gray-700"
									}`}
								>
									Mobile
								</button>
								<button
									onClick={() => setShowPreview(false)}
									className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
								>
									Close
								</button>
							</div>
						</div>
						<div className="flex-1 overflow-auto p-4">
							<div
								className={`mx-auto bg-white ${
									previewMode === "mobile" ? "max-w-sm" : "max-w-2xl"
								}`}
							>
								<iframe
									src={previewUrl}
									className="w-full border border-gray-200 rounded"
									style={{ height: "800px" }}
									title="Newsletter Preview"
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
