import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dbPool } from "../lib/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../db/migrations");

function migrationVersionFromFilename(filename: string) {
  return filename.replace(/\.sql$/i, "");
}

async function main() {
  const pool = dbPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())"
    );
    await client.query("commit");
  } finally {
    client.release();
  }

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const version = migrationVersionFromFilename(file);
    const already = await pool.query<{ version: string }>(
      "select version from schema_migrations where version = $1",
      [version]
    );
    if (already.rowCount && already.rowCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`skip ${version}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query(sql);
      await c.query("insert into schema_migrations (version) values ($1)", [version]);
      await c.query("commit");
      // eslint-disable-next-line no-console
      console.log(`applied ${version}`);
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

