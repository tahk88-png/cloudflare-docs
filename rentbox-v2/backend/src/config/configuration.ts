/**
 * Rentbox v2 - Configuration
 * 
 * Centralized configuration with environment variable validation.
 * All sensitive values come from environment variables.
 */

export default () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRY || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  // Rate Limiting
  rateLimit: {
    default: parseInt(process.env.RATE_LIMIT_DEFAULT || '100', 10),
    booking: parseInt(process.env.RATE_LIMIT_BOOKING || '10', 10),
    payment: parseInt(process.env.RATE_LIMIT_PAYMENT || '5', 10),
  },
  
  // Booking Configuration
  booking: {
    pendingTtlMinutes: parseInt(process.env.BOOKING_PENDING_TTL_MINUTES || '15', 10),
    gracePeriodMinutes: parseInt(process.env.BOOKING_GRACE_PERIOD_MINUTES || '30', 10),
    lateFeeMultiplier: parseFloat(process.env.LATE_FEE_MULTIPLIER || '1.5'),
    earlyAccessMinutes: parseInt(process.env.EARLY_ACCESS_MINUTES || '15', 10),
    maxAppAccessAttempts: parseInt(process.env.MAX_APP_ACCESS_ATTEMPTS || '3', 10),
    defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Europe/Tallinn',
    minRentalHours: parseInt(process.env.MIN_RENTAL_HOURS || '1', 10),
    maxRentalDays: parseInt(process.env.MAX_RENTAL_DAYS || '30', 10),
    cancellationHoursBeforeStart: parseInt(process.env.CANCELLATION_HOURS_BEFORE || '12', 10),
  },
  
  // Payment - Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    currency: process.env.STRIPE_CURRENCY || 'eur',
  },
  
  // SMS - Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  
  // Email - Resend
  email: {
    apiKey: process.env.RESEND_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@rentbox.ee',
    fromName: process.env.EMAIL_FROM_NAME || 'Rentbox',
  },
  
  // Smart-ID / Mobile-ID
  smartId: {
    host: process.env.SMARTID_HOST || 'https://sid.demo.sk.ee/smart-id-rp/v2/',
    relyingPartyUuid: process.env.SMARTID_RELYING_PARTY_UUID,
    relyingPartyName: process.env.SMARTID_RELYING_PARTY_NAME || 'Rentbox',
  },
  
  mobileId: {
    host: process.env.MOBILEID_HOST || 'https://mid.demo.sk.ee/mid-api',
    relyingPartyUuid: process.env.MOBILEID_RELYING_PARTY_UUID,
    relyingPartyName: process.env.MOBILEID_RELYING_PARTY_NAME || 'Rentbox',
  },
  
  // Locker Hardware
  locker: {
    hardwareUrl: process.env.LOCKER_HARDWARE_URL,
    mqttBroker: process.env.LOCKER_MQTT_BROKER,
    mqttUsername: process.env.LOCKER_MQTT_USERNAME,
    mqttPassword: process.env.LOCKER_MQTT_PASSWORD,
    commandTimeoutMs: parseInt(process.env.LOCKER_COMMAND_TIMEOUT_MS || '5000', 10),
    pingIntervalMinutes: parseInt(process.env.LOCKER_PING_INTERVAL_MINUTES || '5', 10),
  },
  
  // Storage - S3/R2
  storage: {
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET || 'rentbox-uploads',
    cdnUrl: process.env.CDN_URL || 'https://cdn.rentbox.ee',
  },
  
  // Signature Requirements
  signature: {
    strongAuthAmountThreshold: parseFloat(process.env.STRONG_AUTH_AMOUNT_THRESHOLD || '200'),
    strongAuthDaysThreshold: parseInt(process.env.STRONG_AUTH_DAYS_THRESHOLD || '7', 10),
  },
  
  // Notifications
  notifications: {
    defaultQuietHoursStart: process.env.DEFAULT_QUIET_HOURS_START || '22:00',
    defaultQuietHoursEnd: process.env.DEFAULT_QUIET_HOURS_END || '08:00',
    rentalStartReminderHours: parseInt(process.env.RENTAL_START_REMINDER_HOURS || '1', 10),
    returnReminderMinutes: parseInt(process.env.RETURN_REMINDER_MINUTES || '30', 10),
    maxRetryAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3', 10),
  },
  
  // Incident Management
  incidents: {
    criticalOverdueHours: parseInt(process.env.CRITICAL_OVERDUE_HOURS || '24', 10),
    escalationHours: parseInt(process.env.INCIDENT_ESCALATION_HOURS || '48', 10),
    autoCreateOverdueIncidentHours: parseInt(process.env.AUTO_INCIDENT_OVERDUE_HOURS || '24', 10),
  },
  
  // Tax
  tax: {
    vatRate: parseFloat(process.env.VAT_RATE || '0.20'),
    country: process.env.TAX_COUNTRY || 'EE',
  },
  
  // Feature Flags
  features: {
    enableSmartId: process.env.FEATURE_SMART_ID !== 'false',
    enableMobileId: process.env.FEATURE_MOBILE_ID !== 'false',
    enableSmsNotifications: process.env.FEATURE_SMS !== 'false',
    enablePushNotifications: process.env.FEATURE_PUSH !== 'false',
    enableAiContentAssist: process.env.FEATURE_AI_CONTENT !== 'false',
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
});
