import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create owner user
  const ownerPassword = await hashPassword("Owner123!");
  const owner = await prisma.user.upsert({
    where: { email: "owner@rentbox.ee" },
    update: {},
    create: {
      email: "owner@rentbox.ee",
      name: "System Owner",
      passwordHash: ownerPassword,
      role: "owner",
      active: true,
    },
  });
  console.log(`✅ Created owner user: ${owner.email}`);

  // Create admin user
  const adminPassword = await hashPassword("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@rentbox.ee" },
    update: {},
    create: {
      email: "admin@rentbox.ee",
      name: "Admin User",
      passwordHash: adminPassword,
      role: "admin",
      active: true,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "power-tools" },
      update: {},
      create: {
        slug: "power-tools",
        name: "Power Tools",
        description: "Electric and battery-powered tools",
        icon: "drill",
        order: 0,
        active: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "hand-tools" },
      update: {},
      create: {
        slug: "hand-tools",
        name: "Hand Tools",
        description: "Manual tools and equipment",
        icon: "hammer",
        order: 1,
        active: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "garden" },
      update: {},
      create: {
        slug: "garden",
        name: "Garden Equipment",
        description: "Outdoor and garden tools",
        icon: "leaf",
        order: 2,
        active: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: "cleaning" },
      update: {},
      create: {
        slug: "cleaning",
        name: "Cleaning Equipment",
        description: "Pressure washers, vacuums, and more",
        icon: "sparkles",
        order: 3,
        active: true,
      },
    }),
  ]);
  console.log(`✅ Created ${categories.length} categories`);

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: "bosch-drill-gsb-18v" },
      update: {},
      create: {
        slug: "bosch-drill-gsb-18v",
        name: "Bosch Drill GSB 18V",
        shortDescription: "Professional cordless drill with 2 batteries",
        description:
          "Professional-grade 18V cordless drill perfect for home renovation projects. Includes 2 batteries and charger.",
        categoryId: categories[0].id,
        basePrice: 5.0,
        priceUnit: "hour",
        slotMinutes: 15,
        minRentalMinutes: 60,
        maxRentalMinutes: 1440, // 24 hours
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: "makita-circular-saw" },
      update: {},
      create: {
        slug: "makita-circular-saw",
        name: "Makita Circular Saw",
        shortDescription: "185mm professional circular saw",
        description:
          "High-performance circular saw for precise cuts in wood and sheet materials.",
        categoryId: categories[0].id,
        basePrice: 6.5,
        priceUnit: "hour",
        slotMinutes: 15,
        minRentalMinutes: 60,
        maxRentalMinutes: 1440,
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: "dewalt-jigsaw" },
      update: {},
      create: {
        slug: "dewalt-jigsaw",
        name: "DeWalt Jigsaw",
        shortDescription: "Variable speed jigsaw with laser guide",
        description:
          "Versatile jigsaw for curved and straight cuts. Features variable speed and laser guide for precision.",
        categoryId: categories[0].id,
        basePrice: 4.5,
        priceUnit: "hour",
        slotMinutes: 15,
        minRentalMinutes: 60,
        active: true,
      },
    }),
    prisma.product.upsert({
      where: { slug: "karcher-pressure-washer" },
      update: {},
      create: {
        slug: "karcher-pressure-washer",
        name: "Kärcher Pressure Washer K5",
        shortDescription: "High-pressure cleaner with 145 bar",
        description:
          "Powerful pressure washer perfect for cleaning patios, cars, and outdoor furniture.",
        categoryId: categories[3].id,
        basePrice: 8.0,
        priceUnit: "hour",
        slotMinutes: 30,
        minRentalMinutes: 120,
        maxRentalMinutes: 480,
        active: true,
      },
    }),
  ]);
  console.log(`✅ Created ${products.length} products`);

  // Create locker
  const locker = await prisma.locker.upsert({
    where: { id: "cuid_locker_downtown" },
    update: {},
    create: {
      id: "cuid_locker_downtown",
      name: "Downtown Locker #1",
      locationText: "Viru Keskus, Tallinn",
      timezone: "Europe/Tallinn",
      active: true,
    },
  });
  console.log(`✅ Created locker: ${locker.name}`);

  // Create compartments
  const compartments = await Promise.all([
    prisma.compartment.upsert({
      where: {
        lockerId_label: { lockerId: locker.id, label: "A1" },
      },
      update: {},
      create: {
        lockerId: locker.id,
        label: "A1",
        productId: products[0].id,
        active: true,
      },
    }),
    prisma.compartment.upsert({
      where: {
        lockerId_label: { lockerId: locker.id, label: "A2" },
      },
      update: {},
      create: {
        lockerId: locker.id,
        label: "A2",
        productId: products[1].id,
        active: true,
      },
    }),
    prisma.compartment.upsert({
      where: {
        lockerId_label: { lockerId: locker.id, label: "B1" },
      },
      update: {},
      create: {
        lockerId: locker.id,
        label: "B1",
        productId: products[2].id,
        active: true,
      },
    }),
    prisma.compartment.upsert({
      where: {
        lockerId_label: { lockerId: locker.id, label: "B2" },
      },
      update: {},
      create: {
        lockerId: locker.id,
        label: "B2",
        productId: products[3].id,
        active: true,
        notes: "Large compartment",
      },
    }),
    prisma.compartment.upsert({
      where: {
        lockerId_label: { lockerId: locker.id, label: "C1" },
      },
      update: {},
      create: {
        lockerId: locker.id,
        label: "C1",
        productId: null,
        active: false,
        notes: "Under maintenance - lock mechanism needs repair",
      },
    }),
  ]);
  console.log(`✅ Created ${compartments.length} compartments`);

  // Create sample booking
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(12, 0, 0, 0);

  const booking = await prisma.booking.create({
    data: {
      productId: products[0].id,
      compartmentId: compartments[0].id,
      startsAt: tomorrow,
      endsAt: tomorrowEnd,
      status: "confirmed",
      paymentStatus: "paid",
      totalPrice: 10.0,
      notes: "Sample booking",
    },
  });
  console.log(`✅ Created sample booking: ${booking.id}`);

  console.log("\n🎉 Seeding completed!");
  console.log("\n📝 Login credentials:");
  console.log("   Owner: owner@rentbox.ee / Owner123!");
  console.log("   Admin: admin@rentbox.ee / Admin123!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
