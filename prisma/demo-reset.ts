import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting demo data...');

  // Delete in order to respect foreign key constraints
  await prisma.auditLog.deleteMany({});
  await prisma.discountRedemption.deleteMany({});
  await prisma.voucherRedemption.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.compartmentProduct.deleteMany({});
  await prisma.compartment.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.locker.deleteMany({});
  await prisma.voucher.deleteMany({});
  await prisma.discountCode.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.systemFlag.deleteMany({});

  console.log('Demo data reset complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
