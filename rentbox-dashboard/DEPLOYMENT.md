# Deployment Guide - Rentbox.ee User Dashboard

This guide covers deploying the Rentbox.ee User Dashboard to various platforms.

## Prerequisites

- Node.js 22+ installed
- npm or yarn package manager
- Git repository set up

## Environment Variables

Before deploying, configure these environment variables:

```bash
VITE_API_BASE_URL=https://api.rentbox.ee
VITE_MOCK_API=false  # Set to 'false' for production
```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Preview production build:**
   ```bash
   npm run preview
   ```

## Deployment Options

### Option 1: Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `VITE_API_BASE_URL`
   - `VITE_MOCK_API=false`

### Option 2: Netlify

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Set environment variables in Netlify dashboard.

### Option 3: GitHub Pages

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. Update `vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: '/rentbox-dashboard/',
     plugins: [react()],
   })
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

### Option 4: Docker

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:22-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. Build and run:
   ```bash
   docker build -t rentbox-dashboard .
   docker run -p 80:80 rentbox-dashboard
   ```

### Option 5: Traditional Web Server

1. Build the project:
   ```bash
   npm run build
   ```

2. Copy the `dist` folder to your web server (Apache, Nginx, etc.)

3. Configure server to serve SPA:

   **Nginx example:**
   ```nginx
   server {
     listen 80;
     server_name dashboard.rentbox.ee;
     root /var/www/rentbox-dashboard;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

   **Apache example (.htaccess):**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

## API Integration

### Connecting to Real API

1. Update `.env`:
   ```bash
   VITE_API_BASE_URL=https://api.rentbox.ee
   VITE_MOCK_API=false
   ```

2. Ensure API endpoints are available:
   - `GET /api/me/dashboard`
   - `GET /api/me/bookings`
   - `GET /api/me/invoices`
   - `POST /api/rentals/{id}/rent-again`

3. Implement authentication:
   - Add token storage mechanism
   - Update `getAuthToken()` function in `src/services/api.ts`
   - Add login/logout functionality

### API Response Format

Expected API response structures:

**Dashboard (`/api/me/dashboard`):**
```json
{
  "summary": {
    "activeRentalsCount": 2,
    "upcomingRentalsCount": 1,
    "pendingInvoicesCount": 1,
    "totalSpent": 245.50,
    "currency": "EUR"
  },
  "activeRentals": [...],
  "upcomingRentals": [...],
  "recentInvoices": [...]
}
```

**Bookings (`/api/me/bookings`):**
```json
{
  "active": [...],
  "upcoming": [...],
  "past": [...]
}
```

**Invoices (`/api/me/invoices`):**
```json
{
  "invoices": [...],
  "agreements": [...]
}
```

## Security Considerations

1. **Authentication:**
   - Implement secure token storage (httpOnly cookies recommended)
   - Add token refresh mechanism
   - Handle expired sessions gracefully

2. **API Security:**
   - Ensure all API calls use HTTPS
   - Implement CORS properly on backend
   - Add rate limiting

3. **Data Privacy:**
   - Never expose admin data
   - Validate all user inputs
   - Sanitize data before rendering

4. **Build Security:**
   - Keep dependencies updated
   - Run security audits: `npm audit`
   - Use environment variables for sensitive data

## Performance Optimization

1. **Enable compression:**
   - Gzip/Brotli on server
   - Optimize images
   - Use CDN for static assets

2. **Caching:**
   - Set proper cache headers
   - Implement service worker for offline support

3. **Monitoring:**
   - Add error tracking (Sentry, etc.)
   - Monitor API performance
   - Track user analytics

## Troubleshooting

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Connection Issues

- Check CORS configuration
- Verify API endpoint URLs
- Check authentication tokens
- Review network requests in browser DevTools

### Styling Issues

```bash
# Rebuild Tailwind
npm run build
```

## Support

For issues or questions:
- Check documentation: `/README.md`
- Review API documentation
- Contact development team

## Updates and Maintenance

1. **Regular updates:**
   ```bash
   npm update
   npm audit fix
   ```

2. **Test after updates:**
   ```bash
   npm run build
   npm run preview
   ```

3. **Monitor production:**
   - Check error logs
   - Monitor API performance
   - Track user feedback
