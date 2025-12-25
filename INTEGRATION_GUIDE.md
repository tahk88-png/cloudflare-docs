# Content Creation System - Integration Guide

## Quick Start

### 1. Create Database

```bash
# Create D1 database
wrangler d1 create content-creation

# Note the database_id from the output and update wrangler.toml
```

Update `wrangler.toml` with the database_id:
```toml
[[d1_databases]]
binding = "CONTENT_DB"
database_name = "content-creation"
database_id = "your-database-id-here"
```

### 2. Initialize Database Schema

```bash
wrangler d1 execute CONTENT_DB --file=scripts/init-content-db.sql
```

Or for local development:
```bash
wrangler d1 execute CONTENT_DB --local --file=scripts/init-content-db.sql
```

### 3. Create R2 Bucket

```bash
# Create R2 bucket
wrangler r2 bucket create content-media
```

The bucket binding is already configured in `wrangler.toml`.

### 4. Set Environment Variables

Create `.dev.vars` file (for local development) or set in Cloudflare dashboard:

```bash
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

### 5. Configure Media Serving

Update `src/lib/content-creation/storage.ts` to use your CDN domain for media URLs:

```typescript
// In uploadFile function, change:
const url = `/media/${fileKey}`;
// To your CDN URL:
const url = `https://your-cdn.com/media/${fileKey}`;
```

Or set up a route to serve files from R2 (already created at `/api/media/[key]`).

### 6. Start Development Server

```bash
npm run dev
```

Navigate to `http://localhost:1111/content-editor` to start using the editor.

## API Routes Integration

All API routes are now integrated with:
- ✅ Cloudflare D1 database
- ✅ Cloudflare R2 storage
- ✅ Proper error handling
- ✅ TypeScript types

### Database Access Pattern

All API routes use the helper functions:

```typescript
import { getDocumentRepository, getMediaRepository } from "~/lib/content-creation/db";

export const GET: APIRoute = async (context) => {
  const repo = getDocumentRepository(context);
  const document = await repo.getDocument(id);
  // ...
};
```

### Storage Access Pattern

```typescript
import { uploadFile, getFile } from "~/lib/content-creation/storage";

export const POST: APIRoute = async (context) => {
  const result = await uploadFile(context, file, key);
  // ...
};
```

## Component Integration

### React Components

All React components are properly integrated with Astro using `client:load`:

```astro
---
import ContentEditorClient from "~/components/content-editor/ContentEditorClient";
---

<ContentEditorClient client:load documentId={documentId} />
```

### Event Handling

The editor uses custom events for AI improvements:

```typescript
// In AIPanel.tsx
const event = new CustomEvent("apply-ai-improvement", {
  detail: { blockId, improvedText }
});
window.dispatchEvent(event);

// In ContentEditor.tsx
window.addEventListener("apply-ai-improvement", handleApplyAI);
```

## Testing the Integration

### 1. Test Database Connection

```bash
# Query database
wrangler d1 execute CONTENT_DB --command="SELECT * FROM documents LIMIT 5"
```

### 2. Test Media Upload

1. Navigate to `/content-editor`
2. Create a new document
3. Add an image block
4. Upload an image
5. Check R2 bucket: `wrangler r2 object list content-media`

### 3. Test AI Integration

1. Select a text block
2. Click "AI Assist"
3. Choose an improvement action
4. Verify API call succeeds (check console)

## Production Deployment

### 1. Deploy Database

```bash
# Run migrations
wrangler d1 execute CONTENT_DB --remote --file=scripts/init-content-db.sql
```

### 2. Deploy Worker

```bash
npm run build
wrangler deploy
```

### 3. Configure R2 Public Access (Optional)

If you want public media access:

```bash
# Set up R2 public bucket or use custom domain
# Update storage.ts URLs accordingly
```

### 4. Set Production Environment Variables

In Cloudflare dashboard:
- Go to Workers & Pages > Your Worker > Settings > Variables
- Add:
  - `AI_API_KEY`
  - `AI_MODEL` (optional)
  - `AI_BASE_URL` (optional)

## Troubleshooting

### Database Not Available

Error: "Database not available"

**Solution:**
1. Check `wrangler.toml` has correct database_id
2. Verify database exists: `wrangler d1 list`
3. Check binding name matches: `CONTENT_DB`

### Storage Not Available

Error: "Storage not available"

**Solution:**
1. Check `wrangler.toml` has R2 bucket binding
2. Verify bucket exists: `wrangler r2 bucket list`
3. Check binding name matches: `CONTENT_MEDIA`

### React Components Not Rendering

**Solution:**
1. Ensure `client:load` directive is used
2. Check browser console for errors
3. Verify React is installed: `npm list react`

### API Routes Returning 500

**Solution:**
1. Check Cloudflare Workers logs
2. Verify database schema is initialized
3. Check environment variables are set
4. Review error messages in console

## Next Steps

1. **Add Authentication**: Protect API routes with Cloudflare Access
2. **Add Rate Limiting**: Use Cloudflare Rate Limiting
3. **Optimize Images**: Add image optimization pipeline
4. **Add Caching**: Cache frequently accessed documents
5. **Add Analytics**: Track usage and performance

## Support

For issues or questions:
1. Check the main README: `src/lib/content-creation/README.md`
2. Review example payloads: `src/lib/content-creation/examples.json`
3. Check API route implementations in `src/pages/api/`
