import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Create User
  const user = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      phone: '+15550199',
      role: 'CUSTOMER'
    }
  });

  // Create Locker
  const locker = await prisma.locker.create({
    data: {
      location: 'Central Station',
      apiKey: 'api_123'
    }
  });

  // Create Compartment
  const compartment = await prisma.compartment.create({
    data: {
      lockerId: locker.id,
      size: 'M',
      status: 'occupied'
    }
  });

  // Create Product
  const product = await prisma.product.create({
    data: {
      name: 'Standard Rental',
      price: 10.00
    }
  });

  // Create Active Booking (Overdue soon)
  await prisma.booking.create({
    data: {
      id: 'booking-123',
      userId: user.id,
      productId: product.id,
      compartmentId: compartment.id,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(Date.now() + 10 * 60 * 1000), // Ends in 10 mins (Reminder candidate)
      status: 'ACTIVE',
      paymentStatus: 'SUCCESS'
    }
  });

  console.log('Seed data created');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
