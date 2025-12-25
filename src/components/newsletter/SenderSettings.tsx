import { useState } from "react";
import type { Newsletter, SenderProfile } from "~/lib/db/types";

interface SenderSettingsProps {
	newsletter: Newsletter;
	senders: SenderProfile[];
	onNewsletterChange: (newsletter: Newsletter) => void;
	onSendersChange: () => void;
}

export function SenderSettings({
	newsletter,
	senders,
	onNewsletterChange,
	onSendersChange,
}: SenderSettingsProps) {
	const [showNewSender, setShowNewSender] = useState(false);
	const [newSender, setNewSender] = useState({
		name: "",
		email: "",
		reply_to: "",
		is_default: false,
	});
	const [saving, setSaving] = useState(false);

	const handleSelectSender = async (senderId: number) => {
		setSaving(true);
		try {
			const response = await fetch(`/api/newsletters/${newsletter.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sender_id: senderId }),
			});

			if (!response.ok) {
				throw new Error("Failed to update sender");
			}

			const data = await response.json();
			onNewsletterChange(data.newsletter);
		} catch (error) {
			console.error("Failed to update sender:", error);
			alert("Failed to update sender");
		} finally {
			setSaving(false);
		}
	};

	const handleCreateSender = async () => {
		if (!newSender.name || !newSender.email) {
			alert("Name and email are required");
			return;
		}

		setSaving(true);
		try {
			const response = await fetch("/api/senders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newSender),
			});

			if (!response.ok) {
				throw new Error("Failed to create sender");
			}

			onSendersChange();
			setNewSender({ name: "", email: "", reply_to: "", is_default: false });
			setShowNewSender(false);
		} catch (error) {
			console.error("Failed to create sender:", error);
			alert("Failed to create sender");
		} finally {
			setSaving(false);
		}
	};

	const selectedSender = senders.find((s) => s.id === newsletter.sender_id);

	return (
		<div className="p-4 space-y-4">
			<h2 className="text-lg font-semibold text-gray-900">Sender Settings</h2>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					From Name & Email
				</label>
				<select
					value={newsletter.sender_id || ""}
					onChange={(e) =>
						handleSelectSender(parseInt(e.target.value) || 0)
					}
					disabled={saving}
					className="w-full border border-gray-300 rounded-md px-3 py-2"
				>
					<option value="">Select sender...</option>
					{senders.map((sender) => (
						<option key={sender.id} value={sender.id}>
							{sender.name} &lt;{sender.email}&gt;
							{sender.is_default ? " (Default)" : ""}
						</option>
					))}
				</select>
			</div>

			{selectedSender && (
				<div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
					<div>
						<span className="font-medium">From:</span> {selectedSender.name}{" "}
						&lt;{selectedSender.email}&gt;
					</div>
					{selectedSender.reply_to && (
						<div>
							<span className="font-medium">Reply to:</span>{" "}
							{selectedSender.reply_to}
						</div>
					)}
				</div>
			)}

			{!showNewSender ? (
				<button
					onClick={() => setShowNewSender(true)}
					className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
				>
					+ Create New Sender Profile
				</button>
			) : (
				<div className="border border-gray-200 rounded-lg p-4 space-y-3">
					<h3 className="font-medium text-gray-900">New Sender Profile</h3>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Name *
						</label>
						<input
							type="text"
							value={newSender.name}
							onChange={(e) =>
								setNewSender({ ...newSender, name: e.target.value })
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2"
							placeholder="e.g., Rentbox.ee"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email *
						</label>
						<input
							type="email"
							value={newSender.email}
							onChange={(e) =>
								setNewSender({ ...newSender, email: e.target.value })
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2"
							placeholder="e.g., info@rentbox.ee"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Reply To (optional)
						</label>
						<input
							type="email"
							value={newSender.reply_to}
							onChange={(e) =>
								setNewSender({ ...newSender, reply_to: e.target.value })
							}
							className="w-full border border-gray-300 rounded-md px-3 py-2"
							placeholder="e.g., support@rentbox.ee"
						/>
					</div>
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={newSender.is_default}
							onChange={(e) =>
								setNewSender({ ...newSender, is_default: e.target.checked })
							}
						/>
						<span className="text-sm">Set as default</span>
					</label>
					<div className="flex gap-2">
						<button
							onClick={handleCreateSender}
							disabled={saving}
							className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
						>
							{saving ? "Creating..." : "Create"}
						</button>
						<button
							onClick={() => {
								setShowNewSender(false);
								setNewSender({
									name: "",
									email: "",
									reply_to: "",
									is_default: false,
								});
							}}
							className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
