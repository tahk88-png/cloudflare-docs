import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	// This repository already has an Astro `src/pages/*` tree.
	// Restrict Next "pages" routing to TSX/JSX so it doesn't try to compile Astro endpoints.
	pageExtensions: ["tsx", "jsx"],
	typescript: {
		tsconfigPath: "tsconfig.next.json",
	},
	// Keep Next isolated; this repo’s primary app is Astro/Starlight.
	// Admin runs via `npm run admin:dev` on port 3001.
};

export default nextConfig;

