# Astro Configuration for Return Flow

To enable the return flow API routes in Astro, you need to configure the Cloudflare adapter.

## Installation

```bash
npm install @astrojs/cloudflare
```

## Configuration

Update your `astro.config.ts`:

```typescript
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
	output: "server",
	adapter: cloudflare({
		runtime: {
			mode: "local", // or "remote" for production
		},
	}),
	// ... rest of your config
});
```

## Environment Variables

The adapter will automatically make D1 databases and R2 buckets available via `Astro.locals.runtime.env` in API routes.

## Testing Locally

For local development, you can use Wrangler:

```bash
wrangler dev
```

This will start a local development server with access to your D1 database and R2 buckets.
