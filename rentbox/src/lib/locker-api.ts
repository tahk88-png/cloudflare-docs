import prisma from './prisma';

export async function openLocker(lockerId: string, compartmentId: string) {
  console.log(`[LOCKER] Opening locker ${lockerId}, compartment ${compartmentId}`);
  // Check if booking allows it (this logic might be in the caller, but let's log it here)
  return { success: true };
}

export async function getLockerStatus(lockerId: string) {
  return { status: 'online', compartments_available: 5 };
}
