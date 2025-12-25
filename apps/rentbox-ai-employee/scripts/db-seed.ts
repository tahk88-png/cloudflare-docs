import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dbQuery } from "../lib/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedFile = path.resolve(__dirname, "../db/seed/seed.sql");

async function main() {
  const sql = await readFile(seedFile, "utf8");
  await dbQuery(sql);
  // eslint-disable-next-line no-console
  console.log("seed complete");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

