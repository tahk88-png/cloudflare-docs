/**
 * Database Schema Definitions
 * 
 * SQL schema for Cloudflare D1 or similar SQLite-based database
 * Can be adapted for other databases
 */

export const DB_SCHEMA = `
-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'et',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Document blocks table
CREATE TABLE IF NOT EXISTS document_blocks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_blocks_document_id ON document_blocks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_blocks_order ON document_blocks(document_id, "order");

-- Media assets table
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(type);

-- Document versions table (for version history)
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(document_id, created_at DESC);

-- AI edit logs table
CREATE TABLE IF NOT EXISTS ai_edit_logs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  block_id TEXT,
  action TEXT NOT NULL,
  tone TEXT,
  language TEXT NOT NULL,
  original_text TEXT NOT NULL,
  improved_text TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_edit_logs_document_id ON ai_edit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_edit_logs_block_id ON ai_edit_logs(block_id);
CREATE INDEX IF NOT EXISTS idx_ai_edit_logs_created_at ON ai_edit_logs(document_id, created_at DESC);
`;

/**
 * Database helper functions
 */
export interface Database {
	query(sql: string, params?: any[]): Promise<any>;
	exec(sql: string): Promise<void>;
}

export class DocumentRepository {
	constructor(private db: Database) {}

	async createDocument(
		id: string,
		title: string,
		language: string,
	): Promise<void> {
		await this.db.query(
			`INSERT INTO documents (id, title, language) VALUES (?, ?, ?)`,
			[id, title, language],
		);
	}

	async getDocument(id: string): Promise<any> {
		const result = await this.db.query(
			`SELECT * FROM documents WHERE id = ?`,
			[id],
		);
		return (result && result.length > 0) ? result[0] : null;
	}

	async updateDocument(
		id: string,
		title?: string,
		language?: string,
	): Promise<void> {
		const updates: string[] = [];
		const params: any[] = [];

		if (title !== undefined) {
			updates.push("title = ?");
			params.push(title);
		}
		if (language !== undefined) {
			updates.push("language = ?");
			params.push(language);
		}

		updates.push("updated_at = datetime('now')");
		params.push(id);

		await this.db.query(
			`UPDATE documents SET ${updates.join(", ")} WHERE id = ?`,
			params,
		);
	}

	async deleteDocument(id: string): Promise<void> {
		await this.db.query(`DELETE FROM documents WHERE id = ?`, [id]);
	}

	async getDocumentBlocks(documentId: string): Promise<any[]> {
		const result = await this.db.query(
			`SELECT * FROM document_blocks WHERE document_id = ? ORDER BY "order" ASC`,
			[documentId],
		);
		return result || [];
	}

	async saveBlock(block: {
		id: string;
		documentId: string;
		type: string;
		contentJson: string;
		order: number;
	}): Promise<void> {
		const existing = await this.db.query(
			`SELECT id FROM document_blocks WHERE id = ?`,
			[block.id],
		);

		if (existing.length > 0) {
			await this.db.query(
				`UPDATE document_blocks SET type = ?, content_json = ?, "order" = ?, updated_at = datetime('now') WHERE id = ?`,
				[block.type, block.contentJson, block.order, block.id],
			);
		} else {
			await this.db.query(
				`INSERT INTO document_blocks (id, document_id, type, content_json, "order") VALUES (?, ?, ?, ?, ?)`,
				[
					block.id,
					block.documentId,
					block.type,
					block.contentJson,
					block.order,
				],
			);
		}
	}

	async deleteBlock(blockId: string): Promise<void> {
		await this.db.query(`DELETE FROM document_blocks WHERE id = ?`, [
			blockId,
		]);
	}

	async reorderBlocks(
		documentId: string,
		blockOrders: Array<{ id: string; order: number }>,
	): Promise<void> {
		// Update all block orders in a transaction
		for (const { id, order } of blockOrders) {
			await this.db.query(
				`UPDATE document_blocks SET "order" = ?, updated_at = datetime('now') WHERE id = ? AND document_id = ?`,
				[order, id, documentId],
			);
		}
	}

	async createVersion(
		id: string,
		documentId: string,
		snapshotJson: string,
	): Promise<void> {
		await this.db.query(
			`INSERT INTO document_versions (id, document_id, snapshot_json) VALUES (?, ?, ?)`,
			[id, documentId, snapshotJson],
		);
	}

	async getVersions(documentId: string): Promise<any[]> {
		return await this.db.query(
			`SELECT * FROM document_versions WHERE document_id = ? ORDER BY created_at DESC`,
			[documentId],
		);
	}

	async getVersion(id: string): Promise<any> {
		const result = await this.db.query(
			`SELECT * FROM document_versions WHERE id = ?`,
			[id],
		);
		return (result && result.length > 0) ? result[0] : null;
	}

	async logAIEdit(log: {
		id: string;
		documentId: string;
		blockId?: string;
		action: string;
		tone?: string;
		language: string;
		originalText: string;
		improvedText: string;
		changeSummary: string;
	}): Promise<void> {
		await this.db.query(
			`INSERT INTO ai_edit_logs (id, document_id, block_id, action, tone, language, original_text, improved_text, change_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				log.id,
				log.documentId,
				log.blockId || null,
				log.action,
				log.tone || null,
				log.language,
				log.originalText,
				log.improvedText,
				log.changeSummary,
			],
		);
	}
}

export class MediaRepository {
	constructor(private db: Database) {}

	async createAsset(asset: {
		id: string;
		type: string;
		url: string;
		thumbnailUrl?: string;
		altText?: string;
	}): Promise<void> {
		await this.db.query(
			`INSERT INTO media_assets (id, type, url, thumbnail_url, alt_text) VALUES (?, ?, ?, ?, ?)`,
			[asset.id, asset.type, asset.url, asset.thumbnailUrl || null, asset.altText || null],
		);
	}

	async getAsset(id: string): Promise<any> {
		const result = await this.db.query(
			`SELECT * FROM media_assets WHERE id = ?`,
			[id],
		);
		return (result && result.length > 0) ? result[0] : null;
	}

	async updateAsset(
		id: string,
		altText?: string,
		thumbnailUrl?: string,
	): Promise<void> {
		const updates: string[] = [];
		const params: any[] = [];

		if (altText !== undefined) {
			updates.push("alt_text = ?");
			params.push(altText);
		}
		if (thumbnailUrl !== undefined) {
			updates.push("thumbnail_url = ?");
			params.push(thumbnailUrl);
		}

		if (updates.length > 0) {
			params.push(id);
			await this.db.query(
				`UPDATE media_assets SET ${updates.join(", ")} WHERE id = ?`,
				params,
			);
		}
	}

	async listAssets(type?: string): Promise<any[]> {
		if (type) {
			return await this.db.query(
				`SELECT * FROM media_assets WHERE type = ? ORDER BY created_at DESC`,
				[type],
			);
		}
		return await this.db.query(
			`SELECT * FROM media_assets ORDER BY created_at DESC`,
		);
	}

	async deleteAsset(id: string): Promise<void> {
		await this.db.query(`DELETE FROM media_assets WHERE id = ?`, [id]);
	}
}
