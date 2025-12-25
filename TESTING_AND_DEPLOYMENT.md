# Testing and Deployment Procedures

This document outlines the testing and deployment procedures for the Cloudflare Developer Documentation site.

## Testing Procedures

### Test Framework

The project uses [Vitest](https://vitest.dev/) as the test runner with two distinct test environments:

1. **Workers Tests** (`.worker.test.ts`): Tests that run in the Cloudflare Workers runtime environment
2. **Node Tests** (`.node.test.ts`): Tests that run in a standard Node.js environment

### Test Configuration

Tests are configured in `vitest.workspace.ts`:
- Workers tests use `@cloudflare/vitest-pool-workers` to simulate the Workers runtime
- Node tests run in a standard Node.js environment with TypeScript path resolution

### Running Tests

#### Run all tests:
```bash
npm run test
```

#### Run tests in watch mode:
```bash
npm run test -- --watch
```

#### Run specific test files:
```bash
npm run test -- worker/index.worker.test.ts
npm run test -- src/util/props.node.test.ts
```

### Test Coverage

Current test suites cover:

1. **HTML Handling** (`worker/index.worker.test.ts`)
   - Index page responses
   - 404 error pages
   - Trailing slash handling

2. **Redirects** (`worker/index.worker.test.ts`)
   - Trailing slash redirects
   - Legacy URL redirects
   - Markdown file redirects

3. **JSON Endpoints** (`worker/index.worker.test.ts`)
   - Compatibility flags API
   - Pages framework configurations
   - Build image language support

4. **RSS Endpoints** (`worker/index.worker.test.ts`)
   - Changelog RSS feeds
   - XML parsing and validation

5. **Utility Functions** (`src/util/props.node.test.ts`)
   - Props processing and validation

6. **Rehype Plugins** (`src/plugins/rehype/index.node.test.ts`)
   - Markdown processing plugins

7. **Preview URL Comments** (`bin/post-preview-url-comment/index.node.test.ts`)
   - GitHub PR comment functionality

### Writing New Tests

#### Workers Tests

Create a file ending in `.worker.test.ts`:

```typescript
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something", async () => {
    const request = new Request("http://fakehost/path");
    const response = await SELF.fetch(request);
    expect(response.status).toBe(200);
  });
});
```

#### Node Tests

Create a file ending in `.node.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something", () => {
    expect(true).toBe(true);
  });
});
```

### CI Testing

Tests run automatically in CI on every pull request to the `production` branch via `.github/workflows/ci.yml`. The CI pipeline:

1. Checks out code
2. Installs dependencies (`npm ci`)
3. Runs type checking (`npm run check`)
4. Runs linting (`npm run lint`)
5. Checks code formatting (`npm run format:core:check`)
6. Builds the site (`npm run build`)
7. Validates redirects (`bin/validate-redirects.ts`)
8. **Runs all tests** (`npm run test`)
9. Posts PR comments on failure

## Deployment Procedures

### Overview

The documentation site is deployed using **Cloudflare Workers** (not Cloudflare Pages, despite the README mention). The site runs as a Workers application that serves static assets from R2 storage.

### Production Deployment

**Trigger:** Automatic deployment when code is pushed to the `production` branch.

**Workflow:** `.github/workflows/publish-production.yml`

**Steps:**

1. **Build Phase**
   - Checks out code
   - Sets up Node.js 22.x
   - Installs dependencies (`npm ci`)
   - Restores build cache
   - Builds the site (`npm run build`)
   - Sets `NODE_OPTIONS=--max-old-space-size=4096` for large builds

2. **Deploy Phase**
   - Deploys to Cloudflare Workers using `npx wrangler deploy`
   - Uses `CLOUDFLARE_API_TOKEN` secret for authentication
   - Deploys to route: `developers.cloudflare.com/*`

3. **Vendored Markdown Upload**
   - Generates vendored markdown index (`bin/generate-index-md.ts`)
   - Uploads markdown archives to R2 bucket (`vendored-markdown`)
   - Syncs markdown files to:
     - ZT DevDocs bucket (`zt-dashboard-dev-docs`)
     - AutoRAG DevDocs bucket (`developer-docs-full`)
   - Uses `rclone` for R2/S3-compatible storage operations

**Configuration:**
- Worker name: `cloudflare-docs` (from `wrangler.toml`)
- Route: `developers.cloudflare.com/*`
- Assets directory: `./dist`
- R2 bucket binding: `VENDORED_MARKDOWN`

### Preview Deployment

**Trigger:** Automatic deployment when code is pushed to any branch except `production`.

**Workflow:** `.github/workflows/publish-preview.yml`

**Steps:**

1. **Build Phase** (same as production)
   - Checks out code
   - Sets up Node.js 22.x
   - Installs dependencies
   - Builds the site

2. **Deploy Phase**
   - Deploys to Cloudflare Workers dispatch namespace: `preview-deployments`
   - Creates two deployments:
     - One named with short SHA (8 characters)
     - One named with branch slug (sanitized branch name)
   - Example: `abc12345` and `feature-branch-name`

3. **PR Comment**
   - Posts preview URL as a comment on the pull request
   - Uses `bin/post-preview-url-comment/index.ts`

**Access:**
- Preview URLs are posted as comments on pull requests
- Deployments are accessible via the Workers dispatch namespace

### Manual Deployment

#### Local Build

```bash
npm run build
```

This creates a production build in the `./dist` directory.

#### Deploy to Production

**Note:** Only use this if you have the necessary permissions and `CLOUDFLARE_API_TOKEN` configured.

```bash
npx wrangler deploy
```

#### Deploy Preview

```bash
SHORT_SHA=$(git rev-parse --short=8 HEAD)
BRANCH_SLUG=$(git rev-parse --abbrev-ref HEAD | iconv -c -t ascii//TRANSLIT | sed -E 's/[~^]+//g' | sed -E 's/[^a-zA-Z0-9]+/-/g' | sed -E 's/^-+|-+$//g' | tr A-Z a-z)

npx wrangler deploy --dispatch-namespace preview-deployments --name $SHORT_SHA
npx wrangler deploy --dispatch-namespace preview-deployments --name $BRANCH_SLUG
```

### Deployment Configuration

**Wrangler Configuration** (`wrangler.toml`):

```toml
name = "cloudflare-docs"
account_id = "b54f07a6c269ecca2fa60f1ae4920c99"
compatibility_date = "2025-06-02"
compatibility_flags = ["nodejs_compat"]
main = "./worker/index.ts"

workers_dev = true
route = { pattern = "developers.cloudflare.com/*", zone_name = "developers.cloudflare.com" }

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "404-page"
run_worker_first = true

[[r2_buckets]]
binding = "VENDORED_MARKDOWN"
bucket_name = "vendored-markdown"
```

### Pre-Deployment Checks

Before deploying, ensure:

1. ✅ All tests pass (`npm run test`)
2. ✅ Type checking passes (`npm run check`)
3. ✅ Linting passes (`npm run lint`)
4. ✅ Code formatting is correct (`npm run format:core:check`)
5. ✅ Build succeeds (`npm run build`)
6. ✅ Redirects are valid (`npx tsm bin/validate-redirects.ts`)

### Rollback Procedure

If a deployment causes issues:

1. **Identify the problematic commit**
   ```bash
   git log --oneline
   ```

2. **Revert the commit**
   ```bash
   git revert <commit-hash>
   git push origin production
   ```

3. **Or deploy a previous version**
   - Use Cloudflare Dashboard to rollback the Worker
   - Or redeploy from a previous commit

### Monitoring

- **Production:** Monitor `developers.cloudflare.com` for errors
- **Preview:** Check preview URLs posted in PR comments
- **Worker Logs:** Available in Cloudflare Dashboard under Workers > cloudflare-docs > Logs

## Related Documentation

- [Contributing Guidelines](./CONTRIBUTING.md)
- [README](./README.md)
- [Astro Configuration](./astro.config.ts)
- [Wrangler Configuration](./wrangler.toml)
