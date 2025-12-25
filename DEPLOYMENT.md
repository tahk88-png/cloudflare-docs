# Deployment Guide

This document provides detailed information about the deployment procedures for the Cloudflare documentation repository.

## Table of Contents

- [Overview](#overview)
- [Deployment Environments](#deployment-environments)
- [Production Deployment](#production-deployment)
- [Preview Deployments](#preview-deployments)
- [CI/CD Pipeline](#cicd-pipeline)
- [Infrastructure](#infrastructure)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## Overview

The Cloudflare documentation site is deployed using:

- **Cloudflare Workers**: Serves the compiled Astro site
- **Cloudflare Pages**: Build and deployment infrastructure
- **GitHub Actions**: CI/CD automation
- **S3-compatible storage**: Vendored Markdown archives

## Deployment Environments

### Production

- **URL**: https://developers.cloudflare.com
- **Branch**: `production`
- **Trigger**: Push to `production` branch
- **Workflow**: `.github/workflows/publish-production.yml`

### Preview

- **URL Pattern**: `https://{branch-slug}.cloudflare-docs.pages.dev` or `https://{commit-sha}.cloudflare-docs.pages.dev`
- **Branch**: Any non-production branch
- **Trigger**: Push to any branch except `production`
- **Workflow**: `.github/workflows/publish-preview.yml`

## Production Deployment

### Deployment Process

When code is pushed to the `production` branch:

1. **Checkout**: Repository is cloned with full history (`fetch-depth: 0`)
2. **Setup**: Node.js 22.x and dependencies are installed
3. **Cache Restore**: Astro assets cache is restored for faster builds
4. **Build**: Site is compiled with `npm run build`
   - Uses increased memory: `--max-old-space-size=4096`
   - Includes GitHub token for API access
5. **Deploy to Workers**: `wrangler deploy` pushes to production
6. **Generate Markdown**: Vendored Markdown is created for external integrations
7. **Upload Archives**: Markdown files are synced to multiple S3 buckets:
   - Vendored Markdown bucket (zipped archive)
   - ZT DevDocs bucket
   - AutoRAG DevDocs bucket
8. **Cache Save**: Astro assets cache is saved for future builds

### Environment Variables (Production)

- `GITHUB_TOKEN`: Provided by GitHub Actions (read-only access)
- `CLOUDFLARE_API_TOKEN`: Required for Wrangler deployment
- `NODE_OPTIONS`: Set to `--max-old-space-size=4096`
- `AWS_ACCESS_KEY_ID` (multiple): For S3 bucket uploads
- `AWS_SECRET_ACCESS_KEY` (multiple): For S3 bucket uploads

### Secrets Required

The following secrets must be configured in GitHub repository settings:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers deploy permissions
- `VENDORED_DEVDOCS_ACCESS_KEY_ID`: S3 access key for vendored markdown
- `VENDORED_DEVDOCS_SECRET_ACCESS_KEY`: S3 secret key for vendored markdown
- `ZT_DEVDOCS_ACCESS_KEY_ID`: S3 access key for ZT dashboard
- `ZT_DEVDOCS_SECRET_ACCESS_KEY`: S3 secret key for ZT dashboard
- `AUTORAG_DEVDOCS_ACCESS_KEY_ID`: S3 access key for AutoRAG
- `AUTORAG_DEVDOCS_SECRET_ACCESS_KEY`: S3 secret key for AutoRAG

## Preview Deployments

### Deployment Process

When code is pushed to any non-production branch:

1. **Repository Check**: Only runs on `cloudflare/cloudflare-docs` repository
2. **Checkout**: Repository is cloned with full history
3. **Setup**: Node.js 22.x and dependencies are installed
4. **Cache Restore**: Astro assets cache is restored
5. **Build**: Site is compiled with `npm run build`
6. **Deploy to Workers**: Creates two preview deployments:
   - One using the short commit SHA (8 characters)
   - One using the branch slug (sanitized branch name)
   - Both deployed to `preview-deployments` namespace
7. **Post Comment**: Preview URLs are posted to the pull request
8. **Cache Save**: Astro assets cache is saved

### Preview URL Naming

Branch names are converted to URL-safe slugs:

```bash
BRANCH_SLUG=$(git rev-parse --abbrev-ref HEAD | \
  iconv -c -t ascii//TRANSLIT | \
  sed -E 's/[~^]+//g' | \
  sed -E 's/[^a-zA-Z0-9]+/-/g' | \
  sed -E 's/^-+|-+$//g' | \
  tr A-Z a-z)
```

### Preview Deployment Lifecycle

- **Creation**: Automatic on branch push
- **Update**: Automatic on subsequent pushes to the same branch
- **Cleanup**: Manual (no automatic cleanup currently)

## CI/CD Pipeline

### Pull Request Workflow

File: `.github/workflows/ci.yml`

Triggered when a pull request is opened or updated against the `production` branch.

#### Jobs

1. **Compile Job** (`compile`):
   - Runs on `ubuntu-latest`
   - Uses concurrency control to cancel outdated runs
   - Steps:
     1. Checkout code
     2. Setup Node.js 22 with npm cache
     3. Restore Astro assets cache
     4. Install dependencies (`npm ci`)
     5. Post CODEOWNERS comment (continue on error)
     6. Type checking (`npm run check`)
     7. ESLint via Reviewdog (reports inline on PR)
     8. Formatting check (`npm run format:core:check`)
     9. Full build with link checking
     10. Worker type checking
     11. Save Astro assets cache
     12. Validate redirects
     13. Run test suite (`npm test`)
     14. Post CI failure comment if needed

#### Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

This ensures only one CI run per PR or branch, canceling outdated runs.

## Infrastructure

### Cloudflare Workers

The documentation site runs on Cloudflare Workers, providing:

- **Global distribution**: Edge deployment worldwide
- **Fast response times**: Content served from nearest location
- **High availability**: Cloudflare's infrastructure reliability
- **Custom routing**: Workers handle URL routing and redirects

### Build Artifacts

- **Main site**: Compiled to `dist/` directory
- **Vendored Markdown**: Generated to `distmd/` directory
- **LLM-optimized Markdown**: Generated to `distllms/` directory

### Caching Strategy

- **Astro assets cache**: Persistent across builds via GitHub Actions cache
- **Cache key**: `static`
- **Cache paths**: `node_modules/.astro/assets`
- **Benefits**: Faster builds, reduced image processing time

## Troubleshooting

### Build Failures

#### Out of Memory

**Symptom**: Build crashes with "JavaScript heap out of memory"

**Solution**: The build already uses `--max-old-space-size=4096`. If this still fails:
- Check for circular imports
- Review recently added large assets
- Verify no infinite loops in build scripts

#### Type Errors

**Symptom**: `npm run check` fails

**Solution**:
- Run `npm run sync` locally to regenerate Astro types
- Check recent TypeScript changes
- Verify all imports have correct types

#### Link Check Failures

**Symptom**: Build reports broken links

**Solution**:
- Review the build logs for specific broken links
- Fix or remove broken links
- Update redirects if URLs have changed

### Deployment Failures

#### Wrangler Deployment Fails

**Symptom**: `wrangler deploy` exits with error

**Solutions**:
- Verify `CLOUDFLARE_API_TOKEN` is valid and has correct permissions
- Check `wrangler.toml` configuration
- Review Wrangler version compatibility

#### S3 Upload Fails

**Symptom**: rclone fails to upload files

**Solutions**:
- Verify S3 credentials are valid
- Check bucket permissions
- Verify rclone configuration in `bin/rclone.conf`

### Preview Deployment Issues

#### Preview URL Not Posted

**Symptom**: No comment appears on PR with preview URL

**Solutions**:
- Check if the workflow has write permissions for pull requests
- Verify `GITHUB_TOKEN` has correct scopes
- Review `bin/post-preview-url-comment/index.ts` logs

#### Preview Shows Stale Content

**Symptom**: Preview doesn't reflect latest changes

**Solutions**:
- Check that the build completed successfully
- Clear browser cache
- Verify correct branch/SHA is deployed

## Rollback Procedures

### Emergency Rollback

If a production deployment causes issues:

1. **Identify Last Good Commit**:
   ```sh
   git log --oneline production
   ```

2. **Create Rollback Branch**:
   ```sh
   git checkout -b rollback/emergency production~1
   git push origin rollback/emergency
   ```

3. **Create PR and Emergency Merge**:
   - Open PR from rollback branch to `production`
   - Get urgent review
   - Merge immediately

4. **Alternative: Force Push** (use with extreme caution):
   ```sh
   # Only if authorized and documented
   git push origin production~1:production --force
   ```

### Planned Rollback

For planned rollbacks:

1. Open a PR that reverts the problematic changes
2. Follow normal review process
3. Merge when approved

### Post-Rollback

1. Document what went wrong
2. Create issue to track fix
3. Add tests to prevent recurrence
4. Update this guide if needed

## Monitoring

### Build Monitoring

- **GitHub Actions**: Monitor workflow runs in the Actions tab
- **Build duration**: Typical builds take 5-15 minutes
- **Success rate**: Track via GitHub Actions dashboard

### Production Monitoring

- **Cloudflare Analytics**: Monitor traffic and performance
- **Error rate**: Track 4xx and 5xx responses
- **Geographic distribution**: Verify global availability

### Alerts

Consider setting up alerts for:
- Build failures on `production` branch
- Increased error rates
- Unusual traffic patterns
- Failed S3 uploads

## Best Practices

1. **Always test locally first**: Run full build before pushing
2. **Review CI results**: Don't merge PRs with failing checks
3. **Monitor deployments**: Check that deployments complete successfully
4. **Document changes**: Update this guide when infrastructure changes
5. **Use preview deployments**: Test changes in preview before merging
6. **Incremental deployments**: Deploy smaller changes more frequently
7. **Tag releases**: Consider tagging important production deployments

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Astro Build Documentation](https://docs.astro.build/en/guides/deploy/)
- [Testing Guide](./TESTING.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## Getting Help

For deployment issues:

1. Check this guide first
2. Review recent successful deployments for comparison
3. Check GitHub Actions logs for detailed error messages
4. Contact the Developer Docs team in the **Developer Docs** room
5. For emergencies, escalate to on-call engineers
