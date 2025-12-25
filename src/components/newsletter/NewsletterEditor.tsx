import { useState, useEffect } from "react";
import type {
	Newsletter,
	NewsletterBlock,
	SenderProfile,
	NewsletterImage,
} from "~/lib/db/types";
import { BlockEditor } from "./BlockEditor";
import { AITextAssistant } from "./AITextAssistant";
import { ImagesPanel } from "./ImagesPanel";
import { SenderSettings } from "./SenderSettings";
import { PreviewPanel } from "./PreviewPanel";

interface NewsletterEditorProps {
	newsletterId?: number;
}

export function NewsletterEditor({ newsletterId }: NewsletterEditorProps) {
	const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
	const [blocks, setBlocks] = useState<NewsletterBlock[]>([]);
	const [senders, setSenders] = useState<SenderProfile[]>([]);
	const [images, setImages] = useState<NewsletterImage[]>([]);
	const [activeTab, setActiveTab] = useState<"ai" | "images" | "sender">("ai");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Load newsletter data
	useEffect(() => {
		if (newsletterId) {
			loadNewsletter(newsletterId);
		} else {
			createNewNewsletter();
		}
		loadSenders();
		loadImages();
	}, [newsletterId]);

	const loadNewsletter = async (id: number) => {
		try {
			const response = await fetch(`/api/newsletters/${id}`);
			const data = await response.json();
			setNewsletter(data.newsletter);
			setBlocks(data.blocks || []);
		} catch (error) {
			console.error("Failed to load newsletter:", error);
		} finally {
			setLoading(false);
		}
	};

	const createNewNewsletter = async () => {
		try {
			const response = await fetch("/api/newsletters", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject: "New Newsletter",
					preheader: "",
				}),
			});
			const data = await response.json();
			setNewsletter(data.newsletter);
			setBlocks([]);
		} catch (error) {
			console.error("Failed to create newsletter:", error);
		} finally {
			setLoading(false);
		}
	};

	const loadSenders = async () => {
		try {
			const response = await fetch("/api/senders");
			const data = await response.json();
			setSenders(data.senders || []);
		} catch (error) {
			console.error("Failed to load senders:", error);
		}
	};

	const loadImages = async () => {
		try {
			const response = await fetch("/api/images");
			const data = await response.json();
			setImages(data.images || []);
		} catch (error) {
			console.error("Failed to load images:", error);
		}
	};

	const saveNewsletter = async () => {
		if (!newsletter) return;

		setSaving(true);
		try {
			const response = await fetch(`/api/newsletters/${newsletter.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject: newsletter.subject,
					preheader: newsletter.preheader,
					blocks: blocks,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save");
			}

			const data = await response.json();
			setNewsletter(data.newsletter);
		} catch (error) {
			console.error("Failed to save newsletter:", error);
			alert("Failed to save newsletter");
		} finally {
			setSaving(false);
		}
	};

	const updateSubject = (subject: string) => {
		if (newsletter) {
			setNewsletter({ ...newsletter, subject });
		}
	};

	const updatePreheader = (preheader: string) => {
		if (newsletter) {
			setNewsletter({ ...newsletter, preheader });
		}
	};

	const updateBlocks = (newBlocks: NewsletterBlock[]) => {
		setBlocks(newBlocks);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-gray-600">Loading...</div>
			</div>
		);
	}

	if (!newsletter) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-red-600">Failed to load newsletter</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-gray-50">
			{/* Left Panel - Editor */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Header */}
				<div className="bg-white border-b border-gray-200 px-6 py-4">
					<div className="flex items-center justify-between">
						<h1 className="text-xl font-semibold text-gray-900">
							Newsletter Editor
						</h1>
						<button
							onClick={saveNewsletter}
							disabled={saving}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? "Saving..." : "Save"}
						</button>
					</div>
				</div>

				{/* Editor Content */}
				<div className="flex-1 overflow-y-auto px-6 py-6">
					<div className="max-w-3xl mx-auto">
						{/* Subject */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Subject Line
								<span className="text-gray-400 ml-2">
									({newsletter.subject.length}/60)
								</span>
							</label>
							<input
								type="text"
								value={newsletter.subject}
								onChange={(e) => updateSubject(e.target.value)}
								maxLength={60}
								className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter subject line..."
							/>
						</div>

						{/* Preheader */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Preheader
								<span className="text-gray-400 ml-2">
									({newsletter.preheader?.length || 0}/100)
								</span>
							</label>
							<input
								type="text"
								value={newsletter.preheader || ""}
								onChange={(e) => updatePreheader(e.target.value)}
								maxLength={100}
								className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								placeholder="Preview text (optional)..."
							/>
						</div>

						{/* Block Editor */}
						<BlockEditor
							blocks={blocks}
							onChange={updateBlocks}
							images={images}
						/>
					</div>
				</div>
			</div>

			{/* Right Panel - Assistant & Settings */}
			<div className="w-96 bg-white border-l border-gray-200 flex flex-col">
				{/* Tabs */}
				<div className="flex border-b border-gray-200">
					<button
						onClick={() => setActiveTab("ai")}
						className={`flex-1 px-4 py-3 text-sm font-medium ${
							activeTab === "ai"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-600 hover:text-gray-900"
						}`}
					>
						AI Assistant
					</button>
					<button
						onClick={() => setActiveTab("images")}
						className={`flex-1 px-4 py-3 text-sm font-medium ${
							activeTab === "images"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-600 hover:text-gray-900"
						}`}
					>
						Images
					</button>
					<button
						onClick={() => setActiveTab("sender")}
						className={`flex-1 px-4 py-3 text-sm font-medium ${
							activeTab === "sender"
								? "text-blue-600 border-b-2 border-blue-600"
								: "text-gray-600 hover:text-gray-900"
						}`}
					>
						Sender
					</button>
				</div>

				{/* Tab Content */}
				<div className="flex-1 overflow-y-auto">
					{activeTab === "ai" && (
						<AITextAssistant
							newsletterId={newsletter.id}
							blocks={blocks}
							onBlocksChange={updateBlocks}
						/>
					)}
					{activeTab === "images" && (
						<ImagesPanel
							images={images}
							onImagesChange={loadImages}
						/>
					)}
					{activeTab === "sender" && (
						<SenderSettings
							newsletter={newsletter}
							senders={senders}
							onNewsletterChange={setNewsletter}
							onSendersChange={loadSenders}
						/>
					)}
				</div>

				{/* Preview Button */}
				<div className="border-t border-gray-200 p-4">
					<PreviewPanel newsletterId={newsletter.id} />
				</div>
			</div>
		</div>
	);
}
