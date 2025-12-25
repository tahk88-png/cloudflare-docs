# Testing and Deployment Procedures

This document outlines the testing and deployment procedures for the Cloudflare Docs project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)

---

## Prerequisites

### System Requirements

- **Node.js**: Version 22 or higher (required)
- **Package Manager**: npm (required, do not use yarn or pnpm)

### Installing Node.js

You can use [Volta](https://github.com/volta-cli/volta) to manage Node.js versions:

```bash
curl https://get.volta.sh | bash
volta install node@22
```

### Installing Dependencies

```bash
npm install
```

This will:
1. Install all dependencies from `package-lock.json`
2. Apply patches via `patch-package`
3. Run `astro sync` to generate TypeScript types

---

## Local Development

### Starting the Development Server

```bash
npm run dev
```

This starts a local development server at `http://localhost:1111` with hot reload enabled.

### Building for Production

```bash
npm run build
# or
npx astro build
```

This builds the production site to `./dist/`.

### Preview Production Build

```bash
npm run preview
```

---

## Testing

### Test Framework

This project uses [Vitest](https://vitest.dev/) as the test framework with two workspaces:

1. **Workers Tests** (`*.worker.test.ts`): Run in Cloudflare Workers environment using `@cloudflare/vitest-pool-workers`
2. **Node Tests** (`*.node.test.ts`): Run in Node.js environment

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npx vitest --watch

# Run specific test file
npx vitest worker/index.worker.test.ts
```

### Test File Locations

| Test File | Description |
|-----------|-------------|
| `worker/index.worker.test.ts` | Worker integration tests (redirects, HTML handling, JSON endpoints, RSS feeds) |
| `src/util/props.node.test.ts` | Utility function tests |
| `src/plugins/rehype/index.node.test.ts` | Rehype plugin tests |
| `bin/post-preview-url-comment/index.node.test.ts` | Preview URL comment utility tests |

### Writing Tests

#### Workers Tests

```typescript
// *.worker.test.ts
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Feature", () => {
  it("should handle request", async () => {
    const request = new Request("http://fakehost/path");
    const response = await SELF.fetch(request);
    expect(response.status).toBe(200);
  });
});
```

#### Node Tests

```typescript
// *.node.test.ts
import { describe, expect, test } from "vitest";

describe("Feature", () => {
  test("should work correctly", () => {
    expect(true).toBe(true);
  });
});
```

---

## Code Quality

### Type Checking

```bash
# Check both Astro and Worker types
npm run check

# Check Astro types only
npm run check:astro

# Check Worker types only
npm run check:worker
```

### Linting

```bash
# Run ESLint
npm run lint
```

### Formatting

```bash
# Format all files
npm run format

# Check core file formatting (JS, TS, CSS)
npm run format:core:check

# Fix core file formatting
npm run format:core:fix

# Format content files (MD, MDX, Astro)
npm run format:content

# Format data files (JSON, YAML)
npm run format:data
```

### Redirect Validation

```bash
npx tsm bin/validate-redirects.ts
```

This validates that redirects don't have:
- Infinite loops
- Sources with URL fragments

---

## Deployment

### Deployment Platform

The Cloudflare Docs site is deployed using [Cloudflare Workers](https://workers.cloudflare.com/) with [Workers Assets](https://developers.cloudflare.com/workers/static-assets/).

### Production Deployment

Production deployments happen automatically when commits are pushed to the `production` branch. The site is deployed to [developers.cloudflare.com](https://developers.cloudflare.com).

**Production URL:** https://developers.cloudflare.com

### Preview Deployments

Preview deployments are created automatically for:
- Any branch pushed that is not `production`
- All pull requests

Preview URLs follow this pattern:
- **Commit-based:** `https://<short-sha>.preview.developers.cloudflare.com`
- **Branch-based:** `https://<branch-slug>.preview.developers.cloudflare.com`

### Manual Deployment (Cloudflare Employees)

```bash
# Deploy to production
npx wrangler deploy

# Deploy preview
SHORT_SHA=$(git rev-parse --short=8 HEAD)
npx wrangler deploy --dispatch-namespace preview-deployments --name $SHORT_SHA
```

---

## CI/CD Pipeline

### Pull Request Checks (CI)

When a pull request is opened against `production`, the following checks run:

| Step | Description |
|------|-------------|
| `npm ci` | Install dependencies |
| `npm run check` | Type checking (Astro + Worker) |
| ESLint | Linting with GitHub PR review annotations |
| `npm run format:core:check` | Code formatting verification |
| `npm run build` | Full production build with link checking |
| Redirect Validation | Check for redirect issues |
| `npm run test` | Run all tests |

### Build Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub API token for fetching external data |
| `NODE_OPTIONS` | Set to `--max-old-space-size=4192` for large builds |
| `RUN_LINK_CHECK` | Set to `true` to enable link validation |

### GitHub Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yml` | PR to `production` | Runs all CI checks |
| `publish-production.yml` | Push to `production` | Deploys to production |
| `publish-preview.yml` | Push to non-production branches | Creates preview deployments |
| `anchor-link-audit.yml` | Manual | Audits anchor links |
| `image-audit.yml` | Manual | Audits images |
| `pr-label-assign.yml` | PR events | Auto-labels PRs |
| `issue-label-assign.yml` | Issue events | Auto-labels issues |

### Post-Deployment Tasks (Production)

After production deployment:

1. **Vendored Markdown Generation**: Creates markdown archives for external consumption
2. **Upload to Buckets**: Uploads markdown to multiple R2 buckets for:
   - Vendored Markdown bucket
   - Zero Trust Dashboard DevDocs
   - AutoRAG DevDocs

---

## Troubleshooting

### Common Issues

#### Build Fails with Memory Error

Increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4192" npm run build
```

#### Type Errors After Dependency Update

Regenerate types:

```bash
npm run sync
```

#### Worker Tests Fail

Ensure `wrangler.toml` is properly configured and run:

```bash
npm run typegen:worker
```

#### Link Validation Fails

Link validation runs during CI with `RUN_LINK_CHECK=true`. To test locally:

```bash
RUN_LINK_CHECK=true npm run build
```

### Getting Help

- **Cloudflare Employees**: Reach out to the **Developer Docs** room in chat
- **External Contributors**: [Open an issue](https://github.com/cloudflare/cloudflare-docs/issues/new/choose)

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start dev server | `npm run dev` |
| Run tests | `npm run test` |
| Type check | `npm run check` |
| Lint | `npm run lint` |
| Format code | `npm run format` |
| Build | `npm run build` |
| Preview build | `npm run preview` |
