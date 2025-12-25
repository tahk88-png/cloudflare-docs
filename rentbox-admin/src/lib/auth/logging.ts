/**
 * Security logging for access attempts
 * In production, this should integrate with your logging infrastructure
 */

type AccessAttempt = {
  success: boolean;
  userId?: string;
  reason?: string;
  ip: string;
  userAgent: string;
  path?: string;
};

export async function logAccessAttempt(attempt: AccessAttempt): Promise<void> {
  const timestamp = new Date().toISOString();
  const level = attempt.success ? "INFO" : "WARN";
  
  // In production, send to logging service (e.g., Datadog, CloudWatch)
  console.log(
    JSON.stringify({
      timestamp,
      level,
      type: "access_attempt",
      ...attempt,
    })
  );
}

export async function logSecurityEvent(
  event: string,
  details: Record<string, unknown>
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  console.log(
    JSON.stringify({
      timestamp,
      level: "SECURITY",
      event,
      ...details,
    })
  );
}

export async function logRateLimitExceeded(
  ip: string,
  path: string,
  userId?: string
): Promise<void> {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "WARN",
      type: "rate_limit_exceeded",
      ip,
      path,
      userId,
    })
  );
}
