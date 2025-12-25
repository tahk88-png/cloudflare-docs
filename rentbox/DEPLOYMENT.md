# 🚀 Rentbox.ee Catalog - Deployment Guide

## ✅ Pre-Deployment Checklist

Before deploying, verify:
- [x] Tests pass (`npm run build` ✅)
- [x] Database seeded
- [x] Environment variables ready
- [x] Brand colors correct
- [x] Estonian copy verified

**Status:** READY TO DEPLOY ✅

---

## 🎯 Deployment Options

### Option 1: Vercel (Recommended) ⭐

**Why Vercel:**
- Zero-config Next.js deployment
- Automatic HTTPS
- Global CDN
- Serverless functions
- Preview deployments

**Steps:**

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login**
```bash
vercel login
```

3. **Deploy**
```bash
cd /workspace/rentbox
vercel
```

Follow prompts:
- Project name: `rentbox-catalog`
- Link to existing project: No
- Framework preset: Next.js (auto-detected)
- Root directory: `./`
- Build command: `npm run build` (default)
- Output directory: `.next` (default)

4. **Set Environment Variables**
```bash
vercel env add DATABASE_URL production
# Paste your production PostgreSQL URL
```

5. **Deploy to Production**
```bash
vercel --prod
```

**Done!** Your site is live at `https://rentbox-catalog.vercel.app`

---

### Option 2: Docker + Cloud Provider

**Dockerfile** (create this):
```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
```

**Build & Deploy:**
```bash
docker build -t rentbox-catalog .
docker run -p 3000:3000 -e DATABASE_URL="..." rentbox-catalog
```

Deploy to:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform

---

### Option 3: Traditional VPS (Ubuntu)

**Server Setup:**

1. **Install Node.js 22**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PM2**
```bash
sudo npm install -g pm2
```

3. **Clone & Setup**
```bash
git clone <your-repo> /var/www/rentbox
cd /var/www/rentbox
npm install
npm run db:generate
npm run build
```

4. **Setup PostgreSQL**
```bash
sudo apt install postgresql
sudo -u postgres psql
CREATE DATABASE rentbox;
CREATE USER rentbox WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE rentbox TO rentbox;
```

5. **Configure Environment**
```bash
nano .env.production
# Add: DATABASE_URL="postgresql://rentbox:password@localhost:5432/rentbox"
```

6. **Start with PM2**
```bash
pm2 start npm --name "rentbox-catalog" -- start
pm2 save
pm2 startup
```

7. **Setup Nginx**
```nginx
server {
    listen 80;
    server_name rentbox.ee;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Enable HTTPS with Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d rentbox.ee
```

---

## 🗄️ Database Migration

### Current: SQLite (Development)
Located at: `prisma/dev.db`

### Target: PostgreSQL (Production)

**Step 1: Update Schema**
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Step 2: Create Migration**
```bash
npx prisma migrate dev --name init
```

**Step 3: Deploy Migration**
```bash
npx prisma migrate deploy
```

**Step 4: Seed Production**
```bash
npm run db:seed
```

### Database Providers

**Recommended:**
1. **Vercel Postgres** - Integrated with Vercel
2. **Supabase** - Free tier, full PostgreSQL
3. **Railway** - Simple, affordable
4. **Neon** - Serverless PostgreSQL
5. **PlanetScale** - MySQL alternative (change provider)

---

## 🔐 Environment Variables

### Required for Production

**`.env.production`:**
```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Next.js
NODE_ENV=production

# Optional: Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"

# Optional: Sentry
SENTRY_DSN="https://..."
```

### Vercel Environment Variables
Set via dashboard or CLI:
```bash
vercel env add DATABASE_URL production
vercel env add NODE_ENV production
```

---

## 📊 Post-Deployment Verification

### 1. Health Checks
```bash
# Test main page
curl https://your-domain.com/tooriistad

# Test category
curl https://your-domain.com/tooriistad/puurimine-kinnitamine

# Test API (if added)
curl https://your-domain.com/api/health
```

### 2. Database Connection
```bash
# SSH into server
npx prisma studio
# Should open at http://localhost:5555
```

### 3. Performance
- Run Lighthouse audit
- Check Core Web Vitals
- Test on real devices
- Monitor load times

### 4. SEO
- Submit sitemap to Google Search Console
- Verify robots.txt
- Check meta tags with browser tools
- Test social sharing (OpenGraph)

---

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions Example

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate Prisma Client
        run: npx prisma generate
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📈 Monitoring & Analytics

### Add Analytics

**Google Analytics 4:**
```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Error Tracking

**Sentry:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Uptime Monitoring
- UptimeRobot (free)
- Pingdom
- Better Uptime

---

## 🚨 Rollback Plan

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```

### PM2
```bash
# Rollback code
git checkout <previous-commit>
npm install
npm run build

# Restart
pm2 restart rentbox-catalog
```

### Database
```bash
# Rollback migration
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 📋 Launch Checklist

### Before Going Live
- [ ] Production database set up
- [ ] Environment variables configured
- [ ] DNS pointed to server
- [ ] HTTPS certificate active
- [ ] Database migrated and seeded
- [ ] Build successful
- [ ] All pages load
- [ ] Filters work
- [ ] Search functional
- [ ] Mobile responsive
- [ ] Analytics installed
- [ ] Error tracking active

### After Launch
- [ ] Monitor errors (first 24h)
- [ ] Check analytics data flowing
- [ ] Test booking integration
- [ ] Submit to search engines
- [ ] Social media preview test
- [ ] Performance audit
- [ ] User acceptance testing

---

## 🎉 You're Ready to Deploy!

**Current Status:**
- ✅ Code tested and working
- ✅ Build successful
- ✅ Database structure ready
- ✅ Components production-ready
- ✅ Documentation complete

**Recommended First Deployment:**
```bash
cd /workspace/rentbox
vercel
```

This deploys to a preview URL instantly. Test thoroughly, then:
```bash
vercel --prod
```

---

**Questions?** Check:
- `README.md` - Project overview
- `IMPLEMENTATION.md` - Technical details
- `TEST_REPORT.md` - Test results
- `ARCHITECTURE.md` - System design

**Happy Deploying! 🚀**
