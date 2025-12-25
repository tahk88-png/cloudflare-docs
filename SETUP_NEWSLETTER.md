# Newsletter System Setup Guide

## Quick Start

### 1. Database Setup

```bash
# Create D1 database
wrangler d1 create newsletter-db

# Note the database_id from the output, then update wrangler.toml
```

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "newsletter-db"
database_id = "your-database-id-here"
```

Run migrations:

```bash
wrangler d1 execute newsletter-db --file=./migrations/0001_newsletter_system.sql
```

### 2. Image Storage (Optional)

For production, configure R2 bucket for image storage:

```toml
[[r2_buckets]]
binding = "NEWSLETTER_IMAGES"
bucket_name = "newsletter-images"
```

Update `/src/pages/api/images/index.ts` to upload to R2:

```typescript
// Example R2 upload
const objectKey = `images/${Date.now()}-${file.name}`;
await env.NEWSLETTER_IMAGES.put(objectKey, file);
const fileUrl = `https://your-r2-domain.com/${objectKey}`;
```

### 3. AI Integration

Update `/src/pages/api/newsletters/[id]/improve-text.ts` to use your AI provider:

**OpenAI Example:**
```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a professional email copywriter." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  }),
});

const data = await response.json();
const improvedText = data.choices[0].message.content;
```

**Anthropic Example:**
```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
    messages: [
      { role: "user", content: prompt },
    ],
  }),
});
```

### 4. Environment Variables

Add to `.dev.vars` for local development:

```
OPENAI_API_KEY=your-key-here
# or
ANTHROPIC_API_KEY=your-key-here
```

Add secrets for production:

```bash
wrangler secret put OPENAI_API_KEY
```

### 5. Run Development Server

```bash
npm run dev
```

Navigate to `http://localhost:1111/newsletter`

## Testing the System

### Create a Newsletter

1. Go to `/newsletter`
2. Enter subject: "Test Newsletter"
3. Add a paragraph block
4. Add an image block (upload an image first)
5. Save

### Test AI Improvement

1. Add some text blocks
2. Go to AI Assistant tab
3. Select "Improve Clarity"
4. Click "Improve Text"
5. Review and accept changes

### Test Sender Configuration

1. Go to Sender tab
2. Create a new sender profile
3. Select it for the newsletter
4. Preview to see sender info

## Production Deployment

```bash
# Build
npm run build

# Deploy
wrangler deploy
```

## Troubleshooting

### Database Connection Issues

- Ensure D1 binding is configured in `wrangler.toml`
- Check database_id matches your created database
- Verify migrations ran successfully

### Image Upload Fails

- Check file size limits (currently 5MB)
- Verify file types (JPG, PNG, WEBP only)
- For production, ensure R2 bucket is configured

### AI Not Working

- Verify API key is set in environment
- Check API endpoint and model availability
- Review error logs in Cloudflare dashboard

## Next Steps

- [ ] Configure R2 for image storage
- [ ] Integrate AI provider (OpenAI/Anthropic)
- [ ] Add email sending integration (SendGrid, Resend, etc.)
- [ ] Add newsletter scheduling
- [ ] Add recipient list management
- [ ] Add analytics tracking
