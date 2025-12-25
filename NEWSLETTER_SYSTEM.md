# Newsletter Creation System

A professional newsletter creation tool with AI-assisted text improvement, image management, and email sender configuration.

## Features

### Core Functionality
- **Block-based Editor**: Create newsletters using drag-and-drop blocks (headings, paragraphs, lists, images, links)
- **AI Text Assistant**: Improve text with AI while maintaining user control
- **Image Library**: Upload, manage, and reuse images across newsletters
- **Sender Profiles**: Configure email sender identity per newsletter
- **Live Preview**: Preview newsletters in desktop and mobile views
- **Email-Safe HTML**: Generates email-compatible HTML with table layouts

### AI Text Improvement Actions
- Improve clarity
- Shorten text
- Make more persuasive
- Make more friendly
- Make more professional
- Fix grammar & spelling
- Improve CTA
- Highlight offer

### Image Features
- Upload JPG, PNG, WEBP images
- Image library for reuse
- Drag & drop into newsletter
- Alignment options (left, center, right)
- Size presets (small, medium, full-width)
- Alt text and captions
- Auto-optimization for email

## Database Schema

The system uses Cloudflare D1 with the following tables:

- `newsletters`: Main newsletter records
- `newsletter_blocks`: Block-based content
- `newsletter_images`: Image library
- `sender_profiles`: Email sender configurations
- `newsletter_versions`: Version history
- `newsletter_ai_logs`: AI improvement tracking

See `migrations/0001_newsletter_system.sql` for full schema.

## API Endpoints

### Newsletters
- `GET /api/newsletters` - List newsletters
- `POST /api/newsletters` - Create newsletter
- `GET /api/newsletters/:id` - Get newsletter
- `PUT /api/newsletters/:id` - Update newsletter
- `DELETE /api/newsletters/:id` - Delete newsletter
- `POST /api/newsletters/:id/improve-text` - AI text improvement
- `GET /api/newsletters/:id/preview` - Preview newsletter HTML

### Senders
- `GET /api/senders` - List sender profiles
- `POST /api/senders` - Create sender profile
- `GET /api/senders/:id` - Get sender profile
- `PUT /api/senders/:id` - Update sender profile
- `DELETE /api/senders/:id` - Delete sender profile

### Images
- `GET /api/images` - List images
- `POST /api/images` - Upload image

## Setup

### 1. Database Setup

Create a D1 database and run migrations:

```bash
# Create database
wrangler d1 create newsletter-db

# Run migrations
wrangler d1 execute newsletter-db --file=./migrations/0001_newsletter_system.sql
```

Update `wrangler.toml` to include the D1 binding:

```toml
[[d1_databases]]
binding = "DB"
database_name = "newsletter-db"
database_id = "your-database-id"
```

### 2. Image Storage

For production, configure R2 or similar storage for images. Update `/api/images/index.ts` to upload to your storage service.

### 3. AI Integration

Update `/src/lib/ai/prompts.ts` and `/api/newsletters/[id]/improve-text.ts` to integrate with your AI provider (OpenAI, Anthropic, etc.).

## Usage

### Creating a Newsletter

1. Navigate to `/newsletter`
2. Enter subject and preheader
3. Add blocks using the "+" buttons
4. Configure images, sender, and use AI assistant in the right panel
5. Preview and save

### Block Types

- **Heading**: H1-H6 headings
- **Paragraph**: Text paragraphs
- **List**: Ordered or unordered lists
- **Image**: Images with alignment and size options
- **Link**: Hyperlinks

### AI Text Improvement

1. Select blocks to improve (or leave empty for all)
2. Choose improvement action
3. Optionally set tone and target audience
4. Click "Improve Text"
5. Review and accept/reject changes

### Sender Configuration

1. Create sender profiles in the Sender tab
2. Set default sender if needed
3. Select sender for newsletter
4. Preview shows sender information

## Email Output

The system generates:
- **HTML**: Email-safe HTML with table layouts and inline styles
- **Plain Text**: Fallback plain text version
- **Compatibility**: Works with Gmail, Outlook, Apple Mail

## Design Principles

- **User Control**: AI suggests, user decides
- **Professional**: Business-first, no marketing gimmicks
- **Accessible**: Proper alt text, semantic HTML
- **Email-Safe**: Table layouts, inline styles, no modern CSS tricks

## Sample Newsletter JSON

See `src/lib/newsletter/sample.json` for example newsletter structure.

## Development

The system is built with:
- Astro for routing and API
- React for UI components
- Cloudflare D1 for database
- Tailwind CSS for styling

## Notes

- Images are currently stored with placeholder URLs - configure R2 or similar for production
- AI integration is mocked - replace with actual AI API calls
- Email sending functionality not included - integrate with your email service
