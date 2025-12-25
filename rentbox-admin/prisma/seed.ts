import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create owner user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rentbox.ee';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const owner = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'System Owner',
      password: hashedPassword,
      role: UserRole.OWNER,
      active: true,
    },
  });

  console.log('✅ Created owner user:', owner.email);

  // Create default categories
  const categories = [
    {
      slug: 'power-tools',
      name: 'Power Tools',
      description: 'Electric and battery-powered tools',
      icon: '🔧',
      order: 1,
    },
    {
      slug: 'hand-tools',
      name: 'Hand Tools',
      description: 'Manual tools and equipment',
      icon: '🔨',
      order: 2,
    },
    {
      slug: 'garden-equipment',
      name: 'Garden Equipment',
      description: 'Lawn mowers, trimmers, and garden tools',
      icon: '🌿',
      order: 3,
    },
    {
      slug: 'ladders-scaffolding',
      name: 'Ladders & Scaffolding',
      description: 'Height access equipment',
      icon: '🪜',
      order: 4,
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log('✅ Created default categories');

  // Create default settings
  const defaultSettings = [
    {
      key: 'default_slot_minutes',
      value: '15',
      description: 'Default time slot duration in minutes',
    },
    {
      key: 'default_min_rental_minutes',
      value: '60',
      description: 'Default minimum rental duration in minutes',
    },
    {
      key: 'default_timezone',
      value: 'Europe/Tallinn',
      description: 'Default timezone for bookings',
    },
    {
      key: 'contact_email',
      value: 'info@rentbox.ee',
      description: 'Contact email for receipts and notifications',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Created default settings');

  // Create demo locker
  const locker = await prisma.locker.upsert({
    where: { id: 'demo-locker-1' },
    update: {},
    create: {
      id: 'demo-locker-1',
      name: 'Tallinn Central',
      locationText: 'Viru keskus, Tallinn',
      timezone: 'Europe/Tallinn',
      active: true,
    },
  });

  // Create demo compartments
  const compartmentLabels = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'];
  for (const label of compartmentLabels) {
    await prisma.compartment.upsert({
      where: {
        lockerId_label: {
          lockerId: locker.id,
          label,
        },
      },
      update: {},
      create: {
        lockerId: locker.id,
        label,
        active: true,
      },
    });
  }

  console.log('✅ Created demo locker and compartments');

  console.log('🎉 Seed completed successfully!');
  console.log(`\n📧 Admin credentials:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n🚀 You can now log in to the admin panel`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
