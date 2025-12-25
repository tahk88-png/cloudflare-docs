import { Booking, BookingStatus } from "@prisma/client";

export function checkOverlap(
  newStart: Date,
  newEnd: Date,
  existingBookings: Pick<Booking, 'starts_at' | 'ends_at' | 'status'>[]
): boolean {
  if (newEnd <= newStart) throw new Error("End time must be after start time");
  
  // Note: "Cannot book in the past" check might depend on exact "now" during test, 
  // so we might relax it for pure overlap logic unit testing, or inject "now".
  // For this pure logic function, I'll focus on overlap.

  return existingBookings.some((booking) => {
    if ([BookingStatus.CANCELLED, BookingStatus.COMPLETED].includes(booking.status)) return false;
    
    // Overlap logic:
    // New start is inside existing
    // New end is inside existing
    // New envelops existing
    
    return (
      (newStart >= booking.starts_at && newStart < booking.ends_at) ||
      (newEnd > booking.starts_at && newEnd <= booking.ends_at) ||
      (newStart <= booking.starts_at && newEnd >= booking.ends_at)
    );
  });
}
