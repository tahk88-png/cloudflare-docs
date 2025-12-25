import { prisma } from "@/lib/prisma";
import { Booking, BookingStatus, Prisma } from "@prisma/client";

export async function getBookings(
  params: {
    page?: number;
    limit?: number;
    status?: BookingStatus;
    compartmentId?: string;
    productId?: string;
  } = {}
) {
  const { page = 1, limit = 50, status, compartmentId, productId } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.BookingWhereInput = {};
  if (status) where.status = status;
  if (compartmentId) where.compartmentId = compartmentId;
  if (productId) where.productId = productId;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        product: true,
        compartment: {
          include: {
            locker: true,
          },
        },
        user: true,
      },
      orderBy: {
        starts_at: 'desc',
      },
      take: limit,
      skip,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, totalPages: Math.ceil(total / limit) };
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  return prisma.booking.update({
    where: { id },
    data: { status },
  });
}
