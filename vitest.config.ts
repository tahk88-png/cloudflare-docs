import { defineConfig, defineProject } from "vitest/config";
import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";

import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	test: {
		projects: [
			defineWorkersProject({
				test: {
					name: "Workers",
					include: ["**/*.worker.test.ts"],
					globalSetup: ["./worker/vitest.global-setup.ts"],
					deps: {
						optimizer: {
							ssr: {
								enabled: true,
								include: ["node-html-parser", "yaml"],
							},
						},
					},
					poolOptions: {
						workers: {
							wrangler: { configPath: "./wrangler.toml" },
						},
					},
				},
			}),
			defineProject({
				plugins: [tsconfigPaths()],
				test: {
					name: "Node",
					include: ["**/*.node.test.ts"],
				},
			}),
		],
	},
});

