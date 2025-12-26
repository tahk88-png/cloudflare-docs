# Parandused / Fixes

## Tehtud parandused:

### 1. CORS konfiguratsioon
- **Probleem**: API ei lubanud päringuid web rakendusest
- **Lahendus**: CORS origin muudetud lubama `localhost:3000` ja `localhost:3001`

### 2. Next.js Client Components
- **Probleem**: Server components ei saanud kasutada `useState` ja `useEffect`
- **Lahendus**: Kõik lehed, mis kasutavad API-d, on nüüd client components (`"use client"`)

### 3. API URL resolv
- **Probleem**: API URL ei lahendunud õigesti
- **Lahendus**: Parandatud `getApiUrl()` funktsioon

### 4. Prisma päringud
- **Probleem**: JSON path päringud ei töötanud Prisma-s
- **Lahendus**: Lihtsustatud - kõik eventid laetakse ja filtreeritakse koodis

### 5. Demo scriptid
- **Probleem**: Demo load/reset ei leidnud õigeid path'e
- **Lahendus**: Lisatud `cwd: rootDir` exec funktsioonidesse

### 6. Next.js config
- **Probleem**: Shared package ei transpileerunud
- **Lahendus**: Lisatud `transpilePackages: ['@demo/shared']`

## Nüüd peaks töötama:

```bash
cp .env.example .env
pnpm install
pnpm first-run
```

Avage http://localhost:3000
