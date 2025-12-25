# Deployment Guide

## Production Deployment Checklist

### 1. Database Setup

#### PostgreSQL Configuration

```bash
# Production database setup
createdb rentbox_production

# Create database user
psql -c "CREATE USER rentbox WITH PASSWORD 'secure_password_here';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE rentbox_production TO rentbox;"
```

#### Connection Pooling

For production, use connection pooling:

```bash
# Install pgbouncer
apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
rentbox = host=localhost dbname=rentbox_production

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

### 2. Environment Variables

Create `.env.production`:

```env
# Database
DATABASE_URL=postgresql://rentbox:password@localhost:5432/rentbox_production
DATABASE_POOL_SIZE=20

# Server
PORT=3000
NODE_ENV=production

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
STRIPE_PUBLIC_KEY=pk_live_...

# Cart Configuration
CART_TTL_MINUTES=15
CART_LOCK_TTL_MINUTES=15
MAX_CART_ITEMS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=https://rentbox.ee
```

### 3. Backend Deployment

#### Build

```bash
cd backend
npm ci --production
npm run build
```

#### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rentbox-api',
    script: './dist/index.js',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.rentbox.ee;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### SSL Certificate (Let's Encrypt)

```bash
certbot --nginx -d api.rentbox.ee
```

### 4. Frontend Deployment

#### Build

```bash
cd frontend
npm ci --production
npm run build
```

#### Static Hosting (Nginx)

```nginx
server {
    listen 80;
    server_name rentbox.ee www.rentbox.ee;

    root /var/www/rentbox/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 5. Stripe Webhook Setup

#### Configure Webhook Endpoint

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://api.rentbox.ee/api/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy webhook signing secret to `.env.production`

### 6. Database Migrations

```bash
cd backend
NODE_ENV=production npm run migrate
NODE_ENV=production npm run seed  # Only for initial setup
```

### 7. Monitoring

#### Application Monitoring

```bash
# Install monitoring tools
npm install @sentry/node
npm install prom-client

# Configure Sentry in backend/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

#### Database Monitoring

```sql
-- Create monitoring view
CREATE VIEW system_health AS
SELECT
  (SELECT COUNT(*) FROM carts WHERE status = 'active') as active_carts,
  (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'active')) as active_bookings,
  (SELECT COUNT(*) FROM cart_locks WHERE expires_at > NOW()) as active_locks,
  (SELECT pg_database_size(current_database())) as database_size,
  NOW() as checked_at;
```

#### Logging

```bash
# Create log directory
mkdir -p /var/log/rentbox

# Configure log rotation
cat > /etc/logrotate.d/rentbox << EOF
/var/log/rentbox/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF
```

### 8. Scheduled Tasks

#### Cron Jobs

```bash
# Edit crontab
crontab -e

# Add cleanup job (every hour)
0 * * * * curl -X POST https://api.rentbox.ee/api/admin/cleanup

# Add database backup (daily at 2am)
0 2 * * * pg_dump rentbox_production | gzip > /backups/rentbox_$(date +\%Y\%m\%d).sql.gz

# Clean old backups (keep 30 days)
0 3 * * * find /backups -name "rentbox_*.sql.gz" -mtime +30 -delete
```

### 9. Security Hardening

#### Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

#### PostgreSQL Security

```bash
# Edit /etc/postgresql/14/main/pg_hba.conf
# Only allow local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
```

#### Rate Limiting (Application Level)

Already configured in `backend/src/index.ts`

### 10. Backup Strategy

#### Database Backups

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="rentbox_production"

mkdir -p $BACKUP_DIR

# Full backup
pg_dump -Fc $DB_NAME > $BACKUP_DIR/full_$DATE.dump

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/full_$DATE.dump s3://rentbox-backups/database/

# Keep only last 30 days locally
find $BACKUP_DIR -name "full_*.dump" -mtime +30 -delete
```

#### Application Backups

```bash
# Backup uploaded files, configs, etc.
tar -czf /backups/app_$(date +%Y%m%d).tar.gz \
  /var/www/rentbox \
  /etc/nginx/sites-available/rentbox \
  --exclude=/var/www/rentbox/node_modules
```

### 11. Load Testing

```bash
# Install Apache Bench
apt-get install apache2-utils

# Test cart endpoint
ab -n 1000 -c 10 -H "Content-Type: application/json" \
  -p cart.json https://api.rentbox.ee/api/cart

# Install k6 for advanced testing
wget https://github.com/grafana/k6/releases/download/v0.46.0/k6-v0.46.0-linux-amd64.tar.gz
tar -xzf k6-v0.46.0-linux-amd64.tar.gz
mv k6 /usr/local/bin/
```

### 12. Health Checks

#### Application Health

```bash
# Create healthcheck script
cat > /usr/local/bin/rentbox-health.sh << 'EOF'
#!/bin/bash
HEALTH_URL="https://api.rentbox.ee/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $STATUS -eq 200 ]; then
  echo "OK"
  exit 0
else
  echo "FAILED - Status: $STATUS"
  # Send alert
  exit 1
fi
EOF

chmod +x /usr/local/bin/rentbox-health.sh
```

### 13. Zero-Downtime Deployments

```bash
# Using PM2 cluster mode
pm2 reload rentbox-api --update-env

# Or using blue-green deployment
pm2 start ecosystem.config.js --name rentbox-api-blue
# Test new deployment
# Switch traffic
pm2 delete rentbox-api-green
pm2 restart rentbox-api-blue --name rentbox-api-green
```

### 14. Disaster Recovery

#### Recovery Plan

1. **Database Recovery**
   ```bash
   # Restore from backup
   pg_restore -d rentbox_production /backups/database/latest.dump
   ```

2. **Application Recovery**
   ```bash
   # Pull latest code
   git pull origin production
   npm ci
   npm run build
   pm2 restart all
   ```

3. **Data Integrity Check**
   ```sql
   -- Check for orphaned records
   SELECT COUNT(*) FROM cart_locks cl
   LEFT JOIN carts c ON c.id = cl.cart_id
   WHERE c.id IS NULL;
   
   -- Cleanup if needed
   DELETE FROM cart_locks WHERE cart_id NOT IN (SELECT id FROM carts);
   ```

### 15. Performance Optimization

#### Database Indexes

```sql
-- Ensure all critical indexes exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_compartment_time 
ON bookings(compartment_id, start_at, end_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_locks_expires 
ON cart_locks(expires_at) WHERE expires_at > NOW();

-- Vacuum and analyze
VACUUM ANALYZE;
```

#### Query Optimization

```sql
-- Enable query logging for slow queries
ALTER DATABASE rentbox_production SET log_min_duration_statement = 1000;
```

#### Caching

Consider adding Redis for:
- Cart data caching
- Product availability caching
- Session management

```bash
# Install Redis
apt-get install redis-server
systemctl enable redis-server
systemctl start redis-server
```

### 16. Compliance

#### GDPR Considerations

- Implement data export endpoint
- Add data deletion endpoint
- Log user consent
- Anonymize old booking data

#### PCI DSS

- Never store card details (handled by Stripe)
- Log all payment transactions
- Encrypt sensitive data at rest
- Use TLS 1.3 for all connections

---

## Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Rentbox..."

# Backup database
echo "📦 Creating backup..."
pg_dump rentbox_production > /backups/pre_deploy_$(date +%Y%m%d).sql

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin production

# Backend
echo "🔧 Building backend..."
cd backend
npm ci
npm run build

# Frontend
echo "🎨 Building frontend..."
cd ../frontend
npm ci
npm run build

# Restart services
echo "♻️  Restarting services..."
pm2 reload rentbox-api

echo "✅ Deployment complete!"
```

Run with: `./deploy.sh`
