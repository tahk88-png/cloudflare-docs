import { PrismaClient, BookingStatus, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { addDays, addHours, addMinutes, startOfDay, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Loading demo data...');

  // 1. Create locker
  const locker = await prisma.locker.upsert({
    where: { id: 'demo-locker-1' },
    update: {},
    create: {
      id: 'demo-locker-1',
      name: 'Aespa–Kiisa demo',
      location: 'Kiisa, Harjumaa',
      timezone: 'Europe/Tallinn',
    },
  });

  // 2. Create compartments (A01-A10)
  const compartments = [];
  for (let i = 1; i <= 10; i++) {
    const code = `A${String(i).padStart(2, '0')}`;
    const comp = await prisma.compartment.upsert({
      where: { lockerId_code: { lockerId: locker.id, code } },
      update: {},
      create: {
        lockerId: locker.id,
        code,
      },
    });
    compartments.push(comp);
  }

  // 3. Create products (Makita/Kärcher samples)
  const products = [
    {
      slug: 'makita-dhr242z',
      name: 'Makita DHR242Z SDS Plus Hammer Drill',
      pricing: { hourly: 5.00, daily: 35.00, weekly: 200.00 },
      deposit: 150.00,
    },
    {
      slug: 'makita-dtd152z',
      name: 'Makita DTD152Z Impact Driver',
      pricing: { hourly: 4.00, daily: 25.00, weekly: 140.00 },
      deposit: 120.00,
    },
    {
      slug: 'karcher-k2-compact',
      name: 'Kärcher K2 Compact Pressure Washer',
      pricing: { hourly: 6.00, daily: 40.00, weekly: 220.00 },
      deposit: 180.00,
    },
    {
      slug: 'makita-dls110z',
      name: 'Makita DLS110Z Circular Saw',
      pricing: { hourly: 5.50, daily: 38.00, weekly: 210.00 },
      deposit: 160.00,
    },
    {
      slug: 'karcher-sc3-easyfix',
      name: 'Kärcher SC3 EasyFix Steam Cleaner',
      pricing: { hourly: 7.00, daily: 45.00, weekly: 250.00 },
      deposit: 200.00,
    },
    {
      slug: 'makita-dmr115z',
      name: 'Makita DMR115Z Multi Tool',
      pricing: { hourly: 4.50, daily: 30.00, weekly: 170.00 },
      deposit: 130.00,
    },
    {
      slug: 'karcher-wv50-plus',
      name: 'Kärcher WV 50 Plus Window Vacuum',
      pricing: { hourly: 3.50, daily: 22.00, weekly: 120.00 },
      deposit: 100.00,
    },
    {
      slug: 'makita-ddf453z',
      name: 'Makita DDF453Z Cordless Drill Driver',
      pricing: { hourly: 4.00, daily: 28.00, weekly: 160.00 },
      deposit: 140.00,
    },
    {
      slug: 'karcher-fc5-cordless',
      name: 'Kärcher FC5 Cordless Vacuum Cleaner',
      pricing: { hourly: 5.00, daily: 32.00, weekly: 180.00 },
      deposit: 150.00,
    },
    {
      slug: 'makita-dhs680z',
      name: 'Makita DHS680Z Jigsaw',
      pricing: { hourly: 4.50, daily: 30.00, weekly: 170.00 },
      deposit: 135.00,
    },
  ];

  const createdProducts = [];
  for (const prod of products) {
    const p = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: prod,
    });
    createdProducts.push(p);
  }

  // 4. Map products to compartments (each compartment gets 2-3 products)
  for (let i = 0; i < compartments.length; i++) {
    const comp = compartments[i];
    const product1 = createdProducts[i % createdProducts.length];
    const product2 = createdProducts[(i + 1) % createdProducts.length];
    const product3 = createdProducts[(i + 2) % createdProducts.length];

    await prisma.compartmentProduct.upsert({
      where: { compartmentId_productId: { compartmentId: comp.id, productId: product1.id } },
      update: {},
      create: { compartmentId: comp.id, productId: product1.id },
    });
    await prisma.compartmentProduct.upsert({
      where: { compartmentId_productId: { compartmentId: comp.id, productId: product2.id } },
      update: {},
      create: { compartmentId: comp.id, productId: product2.id },
    });
    if (i % 3 === 0) {
      await prisma.compartmentProduct.upsert({
        where: { compartmentId_productId: { compartmentId: comp.id, productId: product3.id } },
        update: {},
        create: { compartmentId: comp.id, productId: product3.id },
      });
    }
  }

  // 5. Create bookings across next 7 days
  const now = new Date();
  const bookings = [];
  const statuses: BookingStatus[] = ['PENDING', 'PAID', 'ACTIVE', 'OVERDUE', 'COMPLETED'];

  for (let day = 0; day < 7; day++) {
    const dayStart = startOfDay(addDays(now, day));
    const comp = compartments[day % compartments.length];
    const product = createdProducts[day % createdProducts.length];

    // Create 2-3 bookings per day
    for (let b = 0; b < (day % 3) + 2; b++) {
      const hour = 9 + (b * 4);
      const startAt = addHours(dayStart, hour);
      const endAt = addHours(startAt, 4);
      const status = statuses[(day + b) % statuses.length];

      try {
        const booking = await prisma.booking.create({
          data: {
            startAt,
            endAt,
            status,
            compartmentId: comp.id,
            productId: product.id,
            lockerId: locker.id,
          },
        });
        bookings.push(booking);
      } catch (e) {
        // Skip if overlap constraint violation
        console.log(`Skipped overlapping booking for ${comp.code} at ${startAt}`);
      }
    }
  }

  // 6. Create maintenance blocks (calendar events)
  const maintenanceBlocks = [
    {
      scope: 'locker',
      startAt: addHours(now, 24),
      endAt: addHours(now, 26),
      meta: { lockerId: locker.id, reason: 'Scheduled maintenance', notes: 'Cleaning and inspection' },
    },
    {
      scope: 'compartment',
      startAt: addHours(now, 48),
      endAt: addHours(now, 50),
      meta: { lockerId: locker.id, compartmentId: compartments[0].id, reason: 'Repair', notes: 'Door mechanism repair' },
    },
    {
      scope: 'global',
      startAt: addHours(now, 72),
      endAt: addHours(now, 75),
      meta: { reason: 'System update', notes: 'Software update window' },
    },
  ];

  for (const block of maintenanceBlocks) {
    await prisma.calendarEvent.upsert({
      where: { id: `demo-cal-${block.startAt.getTime()}` },
      update: {},
      create: {
        id: `demo-cal-${block.startAt.getTime()}`,
        ...block,
      },
    });
  }

  // 7. Create incidents
  await prisma.incident.createMany({
    data: [
      {
        id: 'demo-incident-1',
        severity: 'HIGH',
        status: 'OPEN',
        title: 'Locker door failed to open',
        lockerId: locker.id,
        bookingId: bookings[0]?.id,
        notes: 'Customer reported door A01 failed to open after payment. Manual override used.',
      },
      {
        id: 'demo-incident-2',
        severity: 'MEDIUM',
        status: 'IN_PROGRESS',
        title: 'Payment/access mismatch',
        lockerId: locker.id,
        bookingId: bookings[1]?.id,
        notes: 'Payment processed but access code not generated. Investigating payment gateway.',
      },
    ],
    skipDuplicates: true,
  });

  // 8. Create vouchers
  const vouchers = [
    { code: 'WELCOME10', initial: 10.00, remaining: 10.00, expires: addDays(now, 30) },
    { code: 'SUMMER20', initial: 20.00, remaining: 20.00, expires: addDays(now, 60) },
    { code: 'DEMO15', initial: 15.00, remaining: 8.50, expires: addDays(now, 45) },
    { code: 'TEST5', initial: 5.00, remaining: 0.00, expires: addDays(now, 90) },
    { code: 'VIP50', initial: 50.00, remaining: 50.00, expires: null },
    { code: 'EXPIRED10', initial: 10.00, remaining: 10.00, expires: subDays(now, 5) },
  ];

  for (const v of vouchers) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {},
      create: v,
    });
  }

  // 9. Create discount codes
  await prisma.discountCode.createMany({
    data: [
      {
        id: 'demo-discount-1',
        code: 'FIRST10',
        type: 'percentage',
        value: 10.00,
        limits: { maxUses: 100, maxUsesPerUser: 1, validFrom: now, validUntil: addDays(now, 90) },
      },
      {
        id: 'demo-discount-2',
        code: 'SAVE5EUR',
        type: 'fixed',
        value: 5.00,
        limits: { maxUses: 50, minAmount: 20.00, validFrom: now, validUntil: addDays(now, 60) },
      },
      {
        id: 'demo-discount-3',
        code: 'WEEKEND20',
        type: 'percentage',
        value: 20.00,
        limits: { maxUses: 200, validFrom: now, validUntil: addDays(now, 120) },
      },
      {
        id: 'demo-discount-4',
        code: 'STUDENT15',
        type: 'percentage',
        value: 15.00,
        limits: { maxUses: 500, maxUsesPerUser: 3, validFrom: now, validUntil: addDays(now, 180) },
      },
    ],
    skipDuplicates: true,
  });

  // 10. Create campaigns
  await prisma.campaign.createMany({
    data: [
      {
        id: 'demo-campaign-1',
        name: 'New User Welcome',
        rules: {
          conditions: [{ type: 'firstBooking' }],
          actions: [{ type: 'applyDiscount', value: 10, code: 'FIRST10' }],
        },
        active: true,
      },
      {
        id: 'demo-campaign-2',
        name: 'Weekend Special',
        rules: {
          conditions: [{ type: 'dayOfWeek', values: [5, 6] }],
          actions: [{ type: 'applyDiscount', value: 15, code: 'WEEKEND20' }],
        },
        active: true,
      },
    ],
    skipDuplicates: true,
  });

  // 11. Create system flags (enabled by default)
  const flags = [
    { key: 'checkout_enabled', enabled: true },
    { key: 'maintenance_mode', enabled: false },
    { key: 'new_registrations', enabled: true },
    { key: 'sms_notifications', enabled: true },
    { key: 'email_notifications', enabled: true },
    { key: 'payment_gateway_live', enabled: false },
  ];

  for (const flag of flags) {
    await prisma.systemFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }

  console.log('Demo data loaded successfully!');
  console.log(`- 1 locker, ${compartments.length} compartments`);
  console.log(`- ${createdProducts.length} products`);
  console.log(`- ${bookings.length} bookings`);
  console.log(`- ${maintenanceBlocks.length} maintenance blocks`);
  console.log('- 2 incidents');
  console.log('- 6 vouchers');
  console.log('- 4 discount codes');
  console.log('- 2 campaigns');
  console.log('- 6 system flags');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
