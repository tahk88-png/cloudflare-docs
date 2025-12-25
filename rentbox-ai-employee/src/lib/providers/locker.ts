import { prisma } from '@/lib/db';
import { LockerApiType, BookingStatus, PaymentStatus } from '@prisma/client';

// Locker API abstraction supporting HTTP and MQTT adapters

interface LockerOpenResult {
  success: boolean;
  error?: string;
  timestamp?: Date;
}

interface LockerStatus {
  isOnline: boolean;
  compartments: {
    number: string;
    isOpen: boolean;
    isOperational: boolean;
  }[];
}

// Safety checks before opening locker
interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
}

export async function checkLockerOpenSafety(
  bookingId: string,
  compartmentId: string
): Promise<SafetyCheckResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payments: true,
      compartment: {
        include: { locker: true },
      },
    },
  });

  if (!booking) {
    return { allowed: false, reason: 'Booking not found' };
  }

  // Check 1: Compartment must match
  if (booking.compartmentId !== compartmentId) {
    return { allowed: false, reason: 'Compartment does not match booking' };
  }

  // Check 2: Booking must be paid
  const hasPaidPayment = booking.payments.some(
    (p) => p.status === PaymentStatus.COMPLETED
  );
  if (!hasPaidPayment) {
    return { allowed: false, reason: 'Booking is not paid' };
  }

  // Check 3: Booking status must allow access
  const allowedStatuses: BookingStatus[] = [
    BookingStatus.CONFIRMED,
    BookingStatus.ACTIVE,
  ];
  if (!allowedStatuses.includes(booking.status)) {
    return { allowed: false, reason: `Booking status '${booking.status}' does not allow locker access` };
  }

  // Check 4: Must be within allowed time window
  const now = new Date();
  const startDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  
  // Allow access 2 hours before start and up to 24 hours after end (for returns)
  const accessWindowStart = new Date(startDate.getTime() - 2 * 60 * 60 * 1000);
  const accessWindowEnd = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

  if (now < accessWindowStart) {
    return { allowed: false, reason: 'Rental period has not started yet' };
  }

  if (now > accessWindowEnd) {
    return { allowed: false, reason: 'Access window has expired (more than 24h past return date)' };
  }

  // Check 5: Access code must not be expired
  if (booking.accessExpiresAt && now > new Date(booking.accessExpiresAt)) {
    return { allowed: false, reason: 'Access code has expired' };
  }

  return { allowed: true };
}

// Open locker via HTTP API
async function openLockerHttp(
  apiEndpoint: string,
  apiKey: string | null,
  compartmentNumber: string
): Promise<LockerOpenResult> {
  const timeout = parseInt(process.env.LOCKER_API_TIMEOUT || '5000');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${apiEndpoint}/compartments/${compartmentNumber}/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Locker API error' };
    }

    return { success: true, timestamp: new Date() };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Locker API timeout' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Open locker via MQTT
async function openLockerMqtt(
  lockerId: string,
  compartmentNumber: string
): Promise<LockerOpenResult> {
  // MQTT implementation placeholder
  // In production, this would connect to MQTT broker and publish command
  const mqttBroker = process.env.LOCKER_MQTT_BROKER;

  if (!mqttBroker) {
    return { success: false, error: 'MQTT broker not configured' };
  }

  // Simulated MQTT open command
  // In real implementation:
  // 1. Connect to MQTT broker
  // 2. Publish to topic: `lockers/${lockerId}/compartments/${compartmentNumber}/command`
  // 3. Wait for confirmation on response topic
  // 4. Handle timeout

  console.log(`[MQTT] Opening locker ${lockerId}, compartment ${compartmentNumber}`);
  
  // Placeholder - would integrate with actual MQTT library
  return {
    success: true,
    timestamp: new Date(),
  };
}

// Main locker open function with safety checks
export async function openLocker(
  bookingId: string,
  reason: string
): Promise<LockerOpenResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      compartment: {
        include: { locker: true },
      },
    },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  // Run safety checks
  const safetyCheck = await checkLockerOpenSafety(bookingId, booking.compartmentId);
  if (!safetyCheck.allowed) {
    // Log the failed attempt
    await prisma.aiAction.create({
      data: {
        action: 'open_locker',
        reason,
        outcome: 'FAILED',
        bookingId,
        input: { compartmentId: booking.compartmentId },
        error: safetyCheck.reason,
        triggeredBy: 'locker_api',
      },
    });

    return { success: false, error: safetyCheck.reason };
  }

  const { locker } = booking.compartment;
  let result: LockerOpenResult;

  // Call appropriate API based on locker type
  if (locker.apiType === LockerApiType.HTTP) {
    if (!locker.apiEndpoint) {
      return { success: false, error: 'Locker API endpoint not configured' };
    }
    result = await openLockerHttp(locker.apiEndpoint, locker.apiKey, booking.compartment.number);
  } else {
    result = await openLockerMqtt(locker.id, booking.compartment.number);
  }

  // Log the action
  await prisma.aiAction.create({
    data: {
      action: 'open_locker',
      reason,
      outcome: result.success ? 'SUCCESS' : 'FAILED',
      bookingId,
      input: {
        lockerId: locker.id,
        compartmentId: booking.compartmentId,
        compartmentNumber: booking.compartment.number,
      },
      output: result.success ? { openedAt: result.timestamp } : undefined,
      error: result.error,
      triggeredBy: 'locker_api',
    },
  });

  // Create event for tracking
  await prisma.event.create({
    data: {
      type: result.success ? 'LOCKER_OPEN_SUCCESS' : 'LOCKER_OPEN_FAILED',
      source: 'system',
      bookingId,
      payload: {
        lockerId: locker.id,
        compartmentNumber: booking.compartment.number,
        result: result.success ? 'success' : result.error,
      },
    },
  });

  return result;
}

// Get locker status
export async function getLockerStatus(lockerId: string): Promise<LockerStatus | null> {
  const locker = await prisma.locker.findUnique({
    where: { id: lockerId },
    include: { compartments: true },
  });

  if (!locker) return null;

  // In production, this would query the actual locker API
  // For now, return status based on database
  return {
    isOnline: locker.isActive,
    compartments: locker.compartments.map((c) => ({
      number: c.number,
      isOpen: false, // Would come from actual API
      isOperational: c.isOperational,
    })),
  };
}

// Verify access code
export async function verifyAccessCode(
  bookingId: string,
  accessCode: string
): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      accessCode: true,
      accessExpiresAt: true,
    },
  });

  if (!booking || !booking.accessCode) return false;
  if (booking.accessCode !== accessCode) return false;
  if (booking.accessExpiresAt && new Date() > new Date(booking.accessExpiresAt)) return false;

  return true;
}
