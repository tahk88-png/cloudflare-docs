# Content Creation System

A comprehensive content creation system that helps business users create clear, trustworthy, and publish-ready content. The system combines manual writing, AI-assisted text improvement, and structured image & video usage.

## Features

### Core Capabilities
- **Block-based Editor**: Drag & drop interface for organizing content
- **AI Text Improvement**: Multiple improvement actions while preserving user intent
- **Media Management**: Image uploads and video linking with proper handling
- **Multi-format Preview**: Web, email, and mobile preview modes
- **Version History**: Track changes and compare versions
- **Auto-save**: Automatic saving to prevent data loss

### Block Types
- Heading (H1-H4)
- Paragraph
- Bullet List
- Image
- Video (YouTube, Vimeo, self-hosted)
- Call-to-Action (Button/Link)
- Divider

### AI Improvement Actions
- Improve clarity
- Shorten text
- Expand text
- Make more professional
- Make more friendly
- Make more persuasive
- Fix grammar & spelling
- Improve call-to-action
- Highlight key message
- Simplify language

### AI Controls
- **Tone**: Neutral, Professional, Friendly, Confident, Short & Direct
- **Length**: Shorter, Same length, Longer
- **Target Audience**: Private customer, Business customer, Existing user, New lead
- **Language**: Estonian (default), English, Latvian, Lithuanian

## Architecture

### Database Schema
The system uses SQLite-compatible database (Cloudflare D1) with the following tables:
- `documents` - Document metadata
- `document_blocks` - Content blocks
- `media_assets` - Images and videos
- `document_versions` - Version snapshots
- `ai_edit_logs` - AI improvement history

### API Endpoints

#### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get document with blocks
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/blocks` - Save/update blocks
- `PUT /api/documents/:id/blocks/reorder` - Reorder blocks
- `POST /api/documents/:id/improve-text` - AI text improvement
- `POST /api/documents/:id/preview` - Generate preview

#### Media
- `GET /api/media` - List media assets
- `POST /api/media/upload` - Upload image
- `POST /api/media/link-video` - Link video URL

#### AI
- `POST /api/ai/suggest-media-placement` - Suggest where to add media

## Setup

### Environment Variables
```bash
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1  # Optional, for custom endpoints
```

### Database Setup
Initialize the database schema:
```sql
-- Run the SQL from src/lib/content-creation/db-schema.ts
```

### Storage Setup
Configure storage for media files (Cloudflare R2, S3, etc.) in:
- `src/pages/api/media/upload.ts`

## Usage

### Creating a Document
1. Navigate to `/content-editor`
2. Click "New Document"
3. Enter title and select language
4. Start adding blocks

### Using AI Improvement
1. Select a text block (heading, paragraph, or CTA)
2. Click "AI Assist" in toolbar
3. Choose improvement action and options
4. Click "Improve Text"
5. Review changes and apply if satisfied

### Adding Media
1. Click "Media Library" in toolbar
2. Upload image or link video
3. Select media to insert into document
4. Configure alt text, caption, and layout

### Preview
1. Click "Preview" in toolbar
2. Select preview mode (Web, Email, Mobile)
3. Review warnings if any
4. Check how content renders

## AI Principles

The AI system follows strict rules:
- ✅ Preserves original meaning
- ✅ No exaggeration or false claims
- ✅ No spam or sales-guru language
- ✅ Clear, readable sentences
- ✅ No emojis unless requested
- ✅ Never auto-overwrites user content
- ✅ Always provides change summary

## Media Handling

### Images
- Supported formats: JPG, PNG, WEBP
- Maximum size: 10MB
- Auto-optimization: Yes
- Alt text: Required
- Layout options: Inline, Centered, Full-width

### Videos
- Supported sources: YouTube, Vimeo, Self-hosted (MP4/WEBM)
- Email rendering: Thumbnail with play button
- Web rendering: Embedded iframe or HTML5 video
- Autoplay: Always OFF

## Preview Modes

### Web Preview
- Full HTML rendering
- Responsive layout
- All media embedded

### Email Preview
- Email-safe HTML
- Videos converted to thumbnails
- Images max-width: 600px
- Warnings for long paragraphs

### Mobile Preview
- Mobile-optimized layout
- Touch-friendly sizing
- Responsive images

## Development

### Project Structure
```
src/
├── lib/content-creation/
│   ├── types.ts              # TypeScript types
│   ├── db-schema.ts          # Database schema
│   ├── ai-prompts.ts         # AI prompt templates
│   ├── ai-client.ts           # AI API client
│   ├── media-utils.ts        # Media utilities
│   └── renderer.ts           # HTML renderer
├── components/content-editor/
│   ├── ContentEditor.tsx     # Main editor component
│   ├── BlockList.tsx         # Block list with drag & drop
│   ├── Block.tsx             # Individual block wrapper
│   ├── Toolbar.tsx           # Editor toolbar
│   ├── AIPanel.tsx           # AI improvement panel
│   ├── MediaLibrary.tsx      # Media library
│   ├── PreviewPanel.tsx      # Preview panel
│   └── blocks/              # Block components
└── pages/
    ├── api/                  # API routes
    └── content-editor/       # Editor pages
```

### Adding New Block Types
1. Add type to `BlockType` in `types.ts`
2. Create block component in `blocks/`
3. Add rendering logic in `renderer.ts`
4. Update `ContentEditor.tsx` to handle new type

### Customizing AI Prompts
Edit `src/lib/content-creation/ai-prompts.ts` to modify AI behavior and instructions.

## License

This system is part of the Cloudflare Docs project.
