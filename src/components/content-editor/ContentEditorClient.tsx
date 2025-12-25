/**
 * Content Editor Client Component
 * 
 * Wrapper for Astro integration
 */

import { useEffect, useState } from "react";
import { ContentEditor } from "./ContentEditor";
import type { Document, DocumentBlock } from "~/lib/content-creation/types";

export interface ContentEditorClientProps {
	documentId: string;
}

export default function ContentEditorClient({
	documentId,
}: ContentEditorClientProps) {
	const [initialDocument, setInitialDocument] = useState<Document | undefined>();
	const [initialBlocks, setInitialBlocks] = useState<DocumentBlock[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (documentId) {
			loadDocument();
		} else {
			setIsLoading(false);
		}
	}, [documentId]);

	const loadDocument = async () => {
		try {
			const response = await fetch(`/api/documents/${documentId}`);
			if (response.ok) {
				const data = await response.json();
				setInitialDocument(data.document);
				setInitialBlocks(data.blocks || []);
			}
		} catch (error) {
			console.error("Failed to load document:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async (document: Document, blocks: DocumentBlock[]) => {
		// Save document
		await fetch(`/api/documents/${document.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(document),
		});

		// Save blocks
		await fetch(`/api/documents/${document.id}/blocks`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ blocks }),
		});
	};

	const handleAutoSave = async (document: Document, blocks: DocumentBlock[]) => {
		try {
			await handleSave(document, blocks);
		} catch (error) {
			console.error("Auto-save failed:", error);
		}
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<ContentEditor
			documentId={documentId}
			initialDocument={initialDocument}
			initialBlocks={initialBlocks}
			onSave={handleSave}
			onAutoSave={handleAutoSave}
		/>
	);
}
