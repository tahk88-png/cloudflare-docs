# Prisma Database Schema

This directory contains the Prisma schema and all database-related files.

## Files

- `schema.prisma` - Main Prisma schema definition
- `seed.ts` - Database seed script (minimal)
- `demo-load.ts` - Demo data generator (realistic data)
- `demo-reset.ts` - Demo data cleanup script
- `migrations/` - Database migration files

## Usage

### Generate Prisma Client
```bash
pnpm db:generate
# or
prisma generate
```

### Run Migrations
```bash
pnpm db:migrate
# or
prisma migrate deploy
```

### Seed Database
```bash
pnpm db:seed
# or
prisma db seed
```

### Load Demo Data
```bash
pnpm demo:load
```

### Reset Demo Data
```bash
pnpm demo:reset
```

## Schema Location

The schema is located at `/prisma/schema.prisma` and is used by all packages in the monorepo.

## Client Generation

The Prisma client is generated at the root level and shared across:
- `apps/api` - NestJS backend
- `prisma/seed.ts` - Seed scripts
- `prisma/demo-load.ts` - Demo data scripts

## Important Notes

- Always run `prisma generate` after schema changes
- Migrations are version-controlled in `migrations/`
- Demo data scripts use the same Prisma client
- The client is auto-generated on `pnpm install` via postinstall hook
