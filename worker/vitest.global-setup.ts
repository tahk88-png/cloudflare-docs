import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
	// Worker tests expect the static site output to exist at `./dist`.
	// In a clean checkout it won't, so build it once before the Workers pool starts.
	const distDir = path.resolve(process.cwd(), "dist");

	if (!existsSync(distDir)) {
		execSync("npx astro build", { stdio: "inherit" });
	}
}

