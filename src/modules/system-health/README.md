# System Health & Monitoring Module

A comprehensive observability module for Rentbox v2 focused on operational truth, not vanity metrics.

## Features

- **Health Sources**: Monitors API availability, Database health, Payment provider, SMS provider, Email provider, and Locker access service
- **Status States**: OK, Degraded, Down
- **Admin Dashboard**: Overall system status, per-service status, last incident timestamp, error rates (15min/60min)
- **Alerting**: Threshold-based alerts with escalation (Degraded → notify admin, Down → escalate via SMS)
- **Incident Tracking**: Automatic incident creation and resolution tracking

## Architecture

```
src/modules/system-health/
├── types.ts                 # Core types and interfaces
├── orchestrator.ts          # Health check coordinator
├── incidents.ts             # Incident management
├── alerting.ts              # Alert system with escalation
├── index.ts                 # Main entry point
├── checks/                  # Health check implementations
│   ├── base.ts             # Base health check interface
│   ├── api.ts              # API availability check
│   ├── database.ts         # Database health check
│   ├── payment.ts          # Payment provider check
│   ├── sms.ts              # SMS provider check
│   ├── email.ts            # Email provider check
│   └── locker.ts           # Locker access check
├── api/
│   └── routes.ts           # API endpoint handlers
├── dashboard/
│   └── AdminHealthDashboard.tsx  # React dashboard component
└── worker-integration.ts   # Cloudflare Workers integration
```

## Quick Start

### 1. Initialize the Monitor

```typescript
import { SystemHealthMonitor, HealthCheckConfig, ServiceType } from './modules/system-health';
import { createHealthMonitor } from './modules/system-health/worker-integration';

// In your Cloudflare Worker
const monitor = createHealthMonitor(env);
```

### 2. Set Up Health Checks

The `createHealthMonitor` function automatically registers all configured health checks. You can also register custom checks:

```typescript
import { ApiHealthCheck } from './modules/system-health/checks/api';

monitor.getOrchestrator().registerCheck(
  new ApiHealthCheck('https://api.rentbox.com')
);
```

### 3. Run Health Checks

```typescript
const result = await monitor.checkHealth();
console.log('Overall status:', result.overallStatus);
console.log('Services:', result.services);
```

### 4. Set Up API Endpoints

```typescript
import { handleHealthRequest } from './modules/system-health/worker-integration';

// In your Worker's fetch handler
if (request.url.includes('/api/system/health')) {
  return handleHealthRequest(request, monitor);
}
```

### 5. Configure Alerting

```typescript
import { AlertRule, ServiceType } from './modules/system-health';

const rule: AlertRule = {
  id: 'api-alert',
  service: ServiceType.API,
  threshold: {
    errorRate: 5,        // 5 errors per minute
    responseTime: 3000,  // 3 seconds
  },
  onDegraded: {
    notifyAdmin: true,
    channels: ['email'],
  },
  onDown: {
    escalate: true,
    sms: true,
    channels: ['email', 'sms'],
  },
};

monitor.getAlertManager().registerRule(rule);
```

## API Endpoints

### GET /api/system/health

Public health endpoint. Returns minimal information:

```json
{
  "overallStatus": "OK",
  "services": [
    {
      "service": "api",
      "status": "OK",
      "lastChecked": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/admin/system/health

Admin dashboard endpoint. Returns comprehensive health information:

```json
{
  "systemHealth": {
    "overallStatus": "OK",
    "services": [...],
    "errorRates": [...],
    "lastIncidentTimestamp": "2024-01-15T09:00:00Z",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "incidents": [...],
  "recentAlerts": [...],
  "uptime": {
    "overall": 99.95,
    "byService": {
      "api": 99.98,
      "database": 99.99
    }
  }
}
```

### POST /api/admin/system/health/alerts/:id/acknowledge

Acknowledge an alert:

```json
{
  "acknowledgedBy": "admin@rentbox.com"
}
```

## Health Check Types

### API Health Check

Monitors API availability and response times:

```typescript
import { ApiHealthCheck } from './modules/system-health/checks/api';

const check = new ApiHealthCheck('https://api.rentbox.com', '/health');
```

### Database Health Check

Monitors database connectivity and query performance:

```typescript
import { DatabaseHealthCheck } from './modules/system-health/checks/database';

const dbConnection = {
  query: async (sql: string, params?: unknown[]) => {
    return db.prepare(sql).bind(...(params || [])).all();
  },
  ping: async () => {
    try {
      await db.prepare('SELECT 1').first();
      return true;
    } catch {
      return false;
    }
  },
};

const check = new DatabaseHealthCheck(dbConnection);
```

### Payment Provider Health Check

Monitors payment provider status:

```typescript
import { PaymentProviderHealthCheck } from './modules/system-health/checks/payment';

const provider = {
  ping: async () => {
    const response = await fetch('https://payment-api.com/ping');
    return response.ok;
  },
  getStatus: async () => {
    const response = await fetch('https://payment-api.com/status');
    return response.json();
  },
};

const check = new PaymentProviderHealthCheck(provider, apiKey);
```

Similar patterns apply for SMS, Email, and Locker access checks.

## Alerting

### Alert Rules

Alert rules define thresholds and escalation paths:

```typescript
const rule: AlertRule = {
  id: 'database-alert',
  service: ServiceType.DATABASE,
  threshold: {
    errorRate: 3,        // errors per minute
    responseTime: 2000,  // milliseconds
    availability: 99.5, // percentage
  },
  onDegraded: {
    notifyAdmin: true,
    channels: ['email'],
  },
  onDown: {
    escalate: true,
    sms: true,
    channels: ['email', 'sms'],
  },
};
```

### Alert Channels

Register alert channels:

```typescript
import { AlertChannel } from './modules/system-health/alerting';

const emailChannel: AlertChannel = {
  send: async (alert) => {
    await sendEmail({
      to: 'admin@rentbox.com',
      subject: `Alert: ${alert.service} is ${alert.severity}`,
      body: alert.message,
    });
  },
};

monitor.getAlertManager().registerChannel('email', emailChannel);
```

## Incident Tracking

Incidents are automatically created when services go down or become degraded:

```typescript
const incidents = monitor.getIncidentManager().getActiveIncidents();
const recentIncidents = monitor.getIncidentManager().getRecentIncidents(10);
```

## Admin Dashboard

Use the React component to display the health dashboard:

```tsx
import { AdminHealthDashboardComponent } from './modules/system-health/dashboard/AdminHealthDashboard';

function App() {
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetch('/api/admin/system/health')
      .then(res => res.json())
      .then(setDashboardData);
  }, []);

  return dashboardData && (
    <AdminHealthDashboardComponent
      data={dashboardData}
      onAcknowledgeAlert={(alertId) => {
        fetch(`/api/admin/system/health/alerts/${alertId}/acknowledge`, {
          method: 'POST',
          body: JSON.stringify({ acknowledgedBy: 'admin' }),
        });
      }}
    />
  );
}
```

## Environment Variables

Configure the following environment variables:

```bash
# API URLs
API_URL=https://api.rentbox.com
PAYMENT_API_URL=https://payment-api.com
SMS_API_URL=https://sms-api.com
EMAIL_API_URL=https://email-api.com
LOCKER_API_URL=https://locker-api.com

# API Keys
PAYMENT_API_KEY=your_key
SMS_API_KEY=your_key
EMAIL_API_KEY=your_key
LOCKER_API_KEY=your_key

# Admin Contacts
ADMIN_PHONE=+1234567890
ADMIN_EMAIL=admin@rentbox.com
```

## Error Rate Tracking

Error rates are automatically tracked in 15-minute and 60-minute windows:

- **15-minute window**: Short-term error rate (errors per minute)
- **60-minute window**: Long-term error rate (errors per minute)

Error rates are calculated based on health check results and included in the admin dashboard.

## Status Determination

- **OK**: Service is healthy and responding normally
- **Degraded**: Service is responding but with issues (slow response, errors, etc.)
- **Down**: Service is not responding or completely unavailable

Overall system status is determined by the worst service status:
- If any service is DOWN → Overall status is DOWN
- If any service is DEGRADED → Overall status is DEGRADED
- If all services are OK → Overall status is OK

## Best Practices

1. **Set appropriate timeouts**: Configure timeouts based on your service SLAs
2. **Configure alert thresholds**: Set thresholds that reflect actual operational issues
3. **Use multiple channels**: Don't rely on a single notification channel
4. **Monitor error rates**: Track both short-term (15min) and long-term (60min) error rates
5. **Link incidents**: Use incident tracking to understand service reliability over time
6. **Regular reviews**: Review alert rules and thresholds regularly based on actual incidents

## License

Part of Rentbox v2 system health monitoring.
