# Local Development Setup

Since Cloudflare resources require authentication, here's how to set up the system for local development:

## Option 1: Mock Database (Quick Start)

For development without Cloudflare, you can create a mock database adapter. The system will work but won't persist data.

## Option 2: Local SQLite Database

You can use a local SQLite database for development:

1. Install SQLite:
```bash
sudo apt-get install sqlite3  # Linux
# or
brew install sqlite3  # macOS
```

2. Create local database:
```bash
sqlite3 content-creation.db < scripts/init-content-db.sql
```

3. Update `src/lib/content-creation/db.ts` to use local SQLite in development mode.

## Option 3: Cloudflare Setup (Production)

1. Get Cloudflare API Token:
   - Go to https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
   - Create token with D1 and R2 permissions
   - Set environment variable: `export CLOUDFLARE_API_TOKEN=your_token`

2. Create D1 Database:
```bash
npx wrangler d1 create content-creation
# Copy the database_id and update wrangler.toml
```

3. Initialize Schema:
```bash
npx wrangler d1 execute CONTENT_DB --file=scripts/init-content-db.sql
```

4. Create R2 Bucket:
```bash
npx wrangler r2 bucket create content-media
```

5. Set Environment Variables:
```bash
# Create .dev.vars file
echo "AI_API_KEY=your_openai_key" > .dev.vars
```

6. Start Development:
```bash
npm run dev
```

## Current Status

The development server should be starting. Check http://localhost:1111/content-editor

Note: API routes will fail until database is configured, but you can see the UI.
