import { env } from "./env";
import { countOutboundMessagesForUserInLastHour } from "./repos/messages";
import type { BookingRow } from "./repos/bookings";

export class SafetyError extends Error {
  public code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function assertLockerOpenAllowed(params: {
  booking: BookingRow;
  compartmentId: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const start = new Date(params.booking.start_at);
  const end = new Date(params.booking.end_at);

  if (!params.booking.paid) {
    throw new SafetyError("BOOKING_NOT_PAID", "Locker open is not allowed: booking is not paid.");
  }
  if (params.booking.compartment_id !== params.compartmentId) {
    throw new SafetyError("COMPARTMENT_MISMATCH", "Locker open is not allowed: compartment mismatch.");
  }
  if (now < start || now > end) {
    throw new SafetyError("OUTSIDE_TIME_WINDOW", "Locker open is not allowed: outside allowed time window.");
  }
}

export async function assertOutboundRateLimitAllowed(userId: string) {
  const limit = env().OUTBOUND_RATE_LIMIT_PER_HOUR;
  const sent = await countOutboundMessagesForUserInLastHour(userId);
  if (sent >= limit) {
    throw new SafetyError(
      "OUTBOUND_RATE_LIMIT",
      `Outbound messaging rate limit exceeded (${sent}/${limit} in last hour).`
    );
  }
}

