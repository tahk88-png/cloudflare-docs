# Testing Guide

This document provides comprehensive information about testing procedures for the Cloudflare documentation repository.

## Table of Contents

- [Overview](#overview)
- [Test Setup](#test-setup)
- [Running Tests](#running-tests)
- [Test Types](#test-types)
- [Writing Tests](#writing-tests)
- [CI Pipeline](#ci-pipeline)
- [Local Development Testing](#local-development-testing)
- [Troubleshooting](#troubleshooting)

## Overview

This repository uses [Vitest](https://vitest.dev/) as its testing framework, with support for both Node.js and Cloudflare Workers environments. The test configuration is defined in `vitest.workspace.ts`.

## Test Setup

### Prerequisites

- Node.js 22 or higher
- npm (included with Node.js)

### Installation

Install dependencies:

```sh
npm install
```

## Running Tests

### Run all tests

```sh
npm test
```

### Run tests in watch mode

Watch mode automatically re-runs tests when files change:

```sh
npm test -- --watch
```

### Run specific test files

```sh
npm test -- path/to/test-file.test.ts
```

### Run tests for a specific workspace

Run only Node tests:

```sh
npm test -- --project=Node
```

Run only Workers tests:

```sh
npm test -- --project=Workers
```

## Test Types

### Node Tests (`*.node.test.ts`)

Standard Node.js tests that run in the Node environment. These tests are suitable for:

- Utility functions
- Node-specific APIs
- Build scripts
- GitHub Actions scripts

**Example locations:**
- `src/util/props.node.test.ts`
- `src/plugins/rehype/index.node.test.ts`
- `bin/post-preview-url-comment/index.node.test.ts`

### Workers Tests (`*.worker.test.ts`)

Tests that run in a Cloudflare Workers environment using `@cloudflare/vitest-pool-workers`. These tests are suitable for:

- Workers runtime code
- Edge function logic
- Workers-specific APIs

**Example locations:**
- `worker/index.worker.test.ts`

## Writing Tests

### Node Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Workers Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('Worker', () => {
  it('should handle requests', async () => {
    const request = new Request('https://example.com');
    const response = await fetch(request);
    expect(response.status).toBe(200);
  });
});
```

### Test File Naming

- Node tests: `*.node.test.ts`
- Workers tests: `*.worker.test.ts`

### Best Practices

1. **One test file per source file**: Keep tests close to the code they're testing
2. **Clear test descriptions**: Use descriptive `describe` and `it` blocks
3. **Arrange-Act-Assert pattern**: Structure tests clearly
4. **Avoid test interdependencies**: Each test should be independent
5. **Mock external dependencies**: Use Vitest's mocking capabilities
6. **Test edge cases**: Don't just test the happy path

## CI Pipeline

### Pull Request Checks

When you open a pull request to the `production` branch, the following checks run automatically:

1. **Type Checking** (`npm run check`)
   - Validates TypeScript types for Astro project
   - Validates TypeScript types for Workers

2. **Linting** (ESLint via Reviewdog)
   - Checks code quality
   - Reports issues directly on PR

3. **Formatting** (`npm run format:core:check`)
   - Ensures consistent code style
   - Must match Prettier configuration

4. **Build** (`npm run build`)
   - Compiles the entire site
   - Runs link validation
   - Checks for broken references

5. **Validation Scripts**
   - `validate-redirects.ts`: Checks for redirect loops and invalid sources
   - `validate-codeowners.ts`: Validates CODEOWNERS file syntax

6. **Test Suite** (`npm test`)
   - Runs all Node and Workers tests
   - Must pass before merge

### Workflow File

The CI workflow is defined in `.github/workflows/ci.yml`.

### CI Environment Variables

- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `NODE_OPTIONS`: Set to `--max-old-space-size=4192` for build
- `RUN_LINK_CHECK`: Set to `true` during CI builds

## Local Development Testing

### Pre-commit Checklist

Before committing your changes, run:

```sh
# Check types
npm run check

# Check formatting
npm run format:core:check

# Fix formatting if needed
npm run format:core:fix

# Run linter
npm run lint

# Run tests
npm test

# Try a full build
npm run build
```

### Testing Your Changes Locally

1. **Start development server:**
   ```sh
   npm run dev
   ```

2. **Visit http://localhost:1111** in your browser

3. **Make changes** and see them hot-reload automatically

4. **Run tests** in watch mode in another terminal:
   ```sh
   npm test -- --watch
   ```

### Testing Specific Features

#### Testing redirects

```sh
npx tsx bin/validate-redirects.ts
```

#### Testing code owners

```sh
npx tsx bin/validate-codeowners.ts
```

#### Testing link validation

```sh
RUN_LINK_CHECK=true npm run build
```

## Troubleshooting

### Tests failing locally but passing in CI

- Ensure you're using Node.js 22+ (check with `node -v`)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Astro cache: `rm -rf node_modules/.astro`

### TypeScript errors

- Run `npm run sync` to regenerate Astro types
- Ensure your IDE is using the workspace TypeScript version

### Workers tests failing

- Check `wrangler.toml` configuration
- Ensure `@cloudflare/vitest-pool-workers` is properly installed
- Check Workers runtime compatibility

### Build failures

- Clear the build cache: `rm -rf dist node_modules/.astro`
- Check for syntax errors in MDX files
- Verify all imported components exist

### Memory issues during build

If you encounter heap out of memory errors:

```sh
NODE_OPTIONS=--max-old-space-size=4192 npm run build
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Cloudflare Workers Testing](https://developers.cloudflare.com/workers/testing/)
- [Astro Testing Guide](https://docs.astro.build/en/guides/testing/)
- [Contributing Guidelines](./CONTRIBUTING.md)

## Getting Help

If you encounter issues:

1. Check this guide and the [Contributing Guidelines](./CONTRIBUTING.md)
2. Review existing [GitHub Issues](https://github.com/cloudflare/cloudflare-docs/issues)
3. Open a new issue with:
   - Steps to reproduce
   - Expected vs. actual behavior
   - Your environment (Node version, OS, etc.)
