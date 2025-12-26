/**
 * Local Development Database Adapter
 * 
 * In-memory database for local development without Cloudflare
 * This allows the UI to work even without D1 database configured
 */

import type { Database } from "./db-schema";

class LocalDatabase implements Database {
	private data: Map<string, any[]> = new Map();

	async query(sql: string, params?: any[]): Promise<any[]> {
		// Simple SQL parser for local development
		const upperSql = sql.toUpperCase().trim();

		if (upperSql.startsWith("SELECT")) {
			return this.handleSelect(sql, params || []);
		} else if (upperSql.startsWith("INSERT")) {
			await this.handleInsert(sql, params || []);
			return [];
		} else if (upperSql.startsWith("UPDATE")) {
			await this.handleUpdate(sql, params || []);
			return [];
		} else if (upperSql.startsWith("DELETE")) {
			await this.handleDelete(sql, params || []);
			return [];
		}

		return [];
	}

	async exec(sql: string): Promise<void> {
		// For CREATE TABLE statements, just initialize the table
		if (sql.toUpperCase().includes("CREATE TABLE")) {
			const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
			if (tableMatch) {
				const tableName = tableMatch[1];
				if (!this.data.has(tableName)) {
					this.data.set(tableName, []);
				}
			}
		}
	}

	private handleSelect(sql: string, params: any[]): any[] {
		const tableMatch = sql.match(/FROM (\w+)/i);
		if (!tableMatch) return [];

		const tableName = tableMatch[1];
		let results = this.data.get(tableName) || [];

		// Simple WHERE clause handling
		if (sql.includes("WHERE")) {
			const whereMatch = sql.match(/WHERE (\w+) = \?/i);
			if (whereMatch && params.length > 0) {
				const column = whereMatch[1];
				const value = params[0];
				results = results.filter((row: any) => row[column] === value);
			}
		}

		// Simple ORDER BY handling
		if (sql.includes("ORDER BY")) {
			const orderMatch = sql.match(/ORDER BY (\w+)(?:\s+(ASC|DESC))?/i);
			if (orderMatch) {
				const column = orderMatch[1];
				const direction = orderMatch[2]?.toUpperCase() || "ASC";
				results.sort((a: any, b: any) => {
					const aVal = a[column];
					const bVal = b[column];
					if (direction === "DESC") {
						return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
					}
					return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
				});
			}
		}

		// Simple LIMIT handling
		const limitMatch = sql.match(/LIMIT (\d+)/i);
		if (limitMatch) {
			const limit = parseInt(limitMatch[1]);
			results = results.slice(0, limit);
		}

		return results;
	}

	private async handleInsert(sql: string, params: any[]): Promise<void> {
		const tableMatch = sql.match(/INSERT INTO (\w+)/i);
		if (!tableMatch) return;

		const tableName = tableMatch[1];
		const columnMatch = sql.match(/\(([^)]+)\)/);
		if (!columnMatch) return;

		const columns = columnMatch[1]
			.split(",")
			.map((c) => c.trim().replace(/"/g, ""));

		const row: any = {};
		columns.forEach((col, index) => {
			row[col] = params[index];
		});

		// Add timestamps if columns exist
		if (columns.includes("created_at") && !row.created_at) {
			row.created_at = new Date().toISOString();
		}
		if (columns.includes("updated_at") && !row.updated_at) {
			row.updated_at = new Date().toISOString();
		}

		const table = this.data.get(tableName) || [];
		table.push(row);
		this.data.set(tableName, table);
	}

	private async handleUpdate(sql: string, params: any[]): Promise<void> {
		const tableMatch = sql.match(/UPDATE (\w+)/i);
		if (!tableMatch) return;

		const tableName = tableMatch[1];
		const setMatch = sql.match(/SET (.+?) WHERE/i);
		if (!setMatch) return;

		const updates = setMatch[1].split(",").map((s) => s.trim());
		const whereMatch = sql.match(/WHERE (\w+) = \?/i);
		if (!whereMatch) return;

		const whereColumn = whereMatch[1];
		const whereValue = params[params.length - 1]; // Last param is WHERE value

		const table = this.data.get(tableName) || [];
		const rowIndex = table.findIndex((row: any) => row[whereColumn] === whereValue);

		if (rowIndex >= 0) {
			updates.forEach((update, index) => {
				const [column] = update.split("=").map((s) => s.trim());
				if (column && params[index] !== undefined) {
					table[rowIndex][column] = params[index];
				}
			});
			if (table[rowIndex].updated_at !== undefined) {
				table[rowIndex].updated_at = new Date().toISOString();
			}
			this.data.set(tableName, table);
		}
	}

	private async handleDelete(sql: string, params: any[]): Promise<void> {
		const tableMatch = sql.match(/DELETE FROM (\w+)/i);
		if (!tableMatch) return;

		const tableName = tableMatch[1];
		const whereMatch = sql.match(/WHERE (\w+) = \?/i);
		if (!whereMatch) return;

		const whereColumn = whereMatch[1];
		const whereValue = params[0];

		const table = this.data.get(tableName) || [];
		const filtered = table.filter((row: any) => row[whereColumn] !== whereValue);
		this.data.set(tableName, filtered);
	}
}

// Initialize tables
const localDB = new LocalDatabase();
localDB.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'et',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

localDB.exec(`
CREATE TABLE IF NOT EXISTS document_blocks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

localDB.exec(`
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export function getLocalDB(): Database {
	return localDB;
}
