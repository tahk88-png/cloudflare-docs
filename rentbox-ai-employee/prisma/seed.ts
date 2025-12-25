import { PrismaClient, UserRole, BookingStatus, PaymentStatus, LockerApiType, CompartmentSize, TemplateType, ConversationChannel, TicketPriority, TicketStatus, TicketCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rentbox.ee' },
    update: {},
    create: {
      email: 'admin@rentbox.ee',
      name: 'Admin User',
      phone: '+372555555555',
      role: UserRole.ADMIN,
    },
  });

  const supportUser = await prisma.user.upsert({
    where: { email: 'support@rentbox.ee' },
    update: {},
    create: {
      email: 'support@rentbox.ee',
      name: 'Support Agent',
      phone: '+372555555556',
      role: UserRole.SUPPORT,
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      phone: '+372555123456',
      role: UserRole.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      phone: '+372555789012',
      role: UserRole.CUSTOMER,
    },
  });

  const customer3 = await prisma.user.upsert({
    where: { email: 'alex.wilson@example.com' },
    update: {},
    create: {
      email: 'alex.wilson@example.com',
      name: 'Alex Wilson',
      phone: '+372555345678',
      role: UserRole.CUSTOMER,
    },
  });

  console.log('✅ Users created');

  // Create Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 'prod-camera-1' },
      update: {},
      create: {
        id: 'prod-camera-1',
        name: 'Sony A7 III Camera',
        description: 'Professional mirrorless camera with 24.2MP sensor',
        pricePerDay: 45.00,
        category: 'Photography',
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-drone-1' },
      update: {},
      create: {
        id: 'prod-drone-1',
        name: 'DJI Mavic Air 2',
        description: '4K drone with 34min flight time',
        pricePerDay: 35.00,
        category: 'Photography',
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-bike-1' },
      update: {},
      create: {
        id: 'prod-bike-1',
        name: 'Electric Scooter',
        description: 'Xiaomi Mi Pro 2 Electric Scooter',
        pricePerDay: 15.00,
        category: 'Transportation',
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-ski-1' },
      update: {},
      create: {
        id: 'prod-ski-1',
        name: 'Ski Equipment Set',
        description: 'Complete ski set with boots and poles',
        pricePerDay: 25.00,
        category: 'Sports',
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-tent-1' },
      update: {},
      create: {
        id: 'prod-tent-1',
        name: 'Camping Tent 4-Person',
        description: 'Weather-resistant tent for 4 people',
        pricePerDay: 20.00,
        category: 'Outdoor',
      },
    }),
  ]);

  console.log('✅ Products created');

  // Create Lockers
  const locker1 = await prisma.locker.upsert({
    where: { id: 'locker-tallinn-1' },
    update: {},
    create: {
      id: 'locker-tallinn-1',
      name: 'Tallinn Central Station',
      location: 'Tallinn',
      address: 'Balti jaam, Telliskivi 62, 10412 Tallinn',
      latitude: 59.4401,
      longitude: 24.7346,
      apiType: LockerApiType.HTTP,
      apiEndpoint: 'https://api.lockers.rentbox.ee/v1/locker/tallinn-1',
    },
  });

  const locker2 = await prisma.locker.upsert({
    where: { id: 'locker-tartu-1' },
    update: {},
    create: {
      id: 'locker-tartu-1',
      name: 'Tartu Shopping Center',
      location: 'Tartu',
      address: 'Tasku, Turu 2, 51004 Tartu',
      latitude: 58.3780,
      longitude: 26.7241,
      apiType: LockerApiType.HTTP,
      apiEndpoint: 'https://api.lockers.rentbox.ee/v1/locker/tartu-1',
    },
  });

  console.log('✅ Lockers created');

  // Create Compartments
  const compartments = await Promise.all([
    // Tallinn locker compartments
    ...['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'].map((number, idx) =>
      prisma.compartment.upsert({
        where: { lockerId_number: { lockerId: locker1.id, number } },
        update: {},
        create: {
          lockerId: locker1.id,
          number,
          size: idx < 3 ? CompartmentSize.SMALL : idx < 6 ? CompartmentSize.MEDIUM : CompartmentSize.LARGE,
          isAvailable: true,
        },
      })
    ),
    // Tartu locker compartments
    ...['A1', 'A2', 'B1', 'B2', 'C1'].map((number, idx) =>
      prisma.compartment.upsert({
        where: { lockerId_number: { lockerId: locker2.id, number } },
        update: {},
        create: {
          lockerId: locker2.id,
          number,
          size: idx < 2 ? CompartmentSize.SMALL : idx < 4 ? CompartmentSize.MEDIUM : CompartmentSize.LARGE,
          isAvailable: true,
        },
      })
    ),
  ]);

  console.log('✅ Compartments created');

  // Get compartments for bookings
  const tallinnCompartments = await prisma.compartment.findMany({
    where: { lockerId: locker1.id },
  });

  const tartuCompartments = await prisma.compartment.findMany({
    where: { lockerId: locker2.id },
  });

  // Create Bookings with various statuses
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Booking 1: Confirmed, ready for pickup
  const booking1 = await prisma.booking.create({
    data: {
      userId: customer1.id,
      productId: products[0].id, // Camera
      compartmentId: tallinnCompartments[0].id,
      status: BookingStatus.CONFIRMED,
      startDate: tomorrow,
      endDate: nextWeek,
      totalAmount: 315.00, // 7 days * 45
      depositAmount: 100.00,
      accessCode: 'RB-123456',
      accessExpiresAt: nextWeek,
    },
  });

  // Booking 2: Active (picked up)
  const booking2 = await prisma.booking.create({
    data: {
      userId: customer2.id,
      productId: products[1].id, // Drone
      compartmentId: tallinnCompartments[1].id,
      status: BookingStatus.ACTIVE,
      startDate: yesterday,
      endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      actualPickupAt: yesterday,
      totalAmount: 105.00, // 3 days * 35
      depositAmount: 50.00,
      accessCode: 'RB-234567',
      accessExpiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Booking 3: Overdue (past end date, not returned)
  const booking3 = await prisma.booking.create({
    data: {
      userId: customer3.id,
      productId: products[2].id, // Electric Scooter
      compartmentId: tartuCompartments[0].id,
      status: BookingStatus.OVERDUE,
      startDate: lastWeek,
      endDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      actualPickupAt: lastWeek,
      totalAmount: 75.00, // 5 days * 15
      depositAmount: 30.00,
      accessCode: 'RB-345678',
    },
  });

  // Booking 4: Pending payment
  const booking4 = await prisma.booking.create({
    data: {
      userId: customer1.id,
      productId: products[3].id, // Ski Equipment
      compartmentId: tartuCompartments[1].id,
      status: BookingStatus.PENDING,
      startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      totalAmount: 50.00, // 2 days * 25
      depositAmount: 25.00,
    },
  });

  // Booking 5: Completed
  const booking5 = await prisma.booking.create({
    data: {
      userId: customer2.id,
      productId: products[4].id, // Tent
      compartmentId: tartuCompartments[2].id,
      status: BookingStatus.COMPLETED,
      startDate: new Date(lastWeek.getTime() - 3 * 24 * 60 * 60 * 1000),
      endDate: lastWeek,
      actualPickupAt: new Date(lastWeek.getTime() - 3 * 24 * 60 * 60 * 1000),
      actualReturnAt: lastWeek,
      totalAmount: 60.00, // 3 days * 20
      depositAmount: 20.00,
    },
  });

  console.log('✅ Bookings created');

  // Create Payments
  await prisma.payment.createMany({
    data: [
      {
        bookingId: booking1.id,
        amount: 415.00, // total + deposit
        status: PaymentStatus.COMPLETED,
        paymentMethod: 'card',
        externalId: 'pay_abc123',
        paidAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        bookingId: booking2.id,
        amount: 155.00,
        status: PaymentStatus.COMPLETED,
        paymentMethod: 'card',
        externalId: 'pay_def456',
        paidAt: new Date(yesterday.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        bookingId: booking3.id,
        amount: 105.00,
        status: PaymentStatus.COMPLETED,
        paymentMethod: 'bank_transfer',
        externalId: 'pay_ghi789',
        paidAt: new Date(lastWeek.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        bookingId: booking4.id,
        amount: 75.00,
        status: PaymentStatus.PENDING,
        paymentMethod: 'card',
      },
      {
        bookingId: booking5.id,
        amount: 80.00,
        status: PaymentStatus.COMPLETED,
        paymentMethod: 'card',
        externalId: 'pay_jkl012',
        paidAt: new Date(lastWeek.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Payments created');

  // Create Templates
  await prisma.template.createMany({
    data: [
      {
        name: 'pickup_instructions',
        description: 'Instructions sent when booking is ready for pickup',
        type: TemplateType.PICKUP_INSTRUCTIONS,
        channel: ConversationChannel.EMAIL,
        subject: 'Your Rentbox order is ready for pickup! 📦',
        body: `Hi {{customerName}},

Great news! Your rental order #{{bookingId}} is ready for pickup.

**Pickup Details:**
- Location: {{lockerName}}
- Address: {{lockerAddress}}
- Compartment: {{compartmentNumber}}
- Access Code: {{accessCode}}

**What you're renting:**
- {{productName}}
- Rental Period: {{startDate}} to {{endDate}}

**How to pick up:**
1. Go to the locker location
2. Enter access code {{accessCode}} on the keypad
3. Compartment {{compartmentNumber}} will open
4. Take your item and close the door

Need help? Reply to this email or use our chat support.

Happy renting!
The Rentbox Team`,
        variables: JSON.stringify(['customerName', 'bookingId', 'lockerName', 'lockerAddress', 'compartmentNumber', 'accessCode', 'productName', 'startDate', 'endDate']),
      },
      {
        name: 'return_reminder',
        description: 'Reminder sent 24h before return deadline',
        type: TemplateType.RETURN_REMINDER,
        channel: ConversationChannel.EMAIL,
        subject: 'Reminder: Return your Rentbox rental tomorrow ⏰',
        body: `Hi {{customerName}},

Just a friendly reminder that your rental period for order #{{bookingId}} ends tomorrow.

**Return Details:**
- Return by: {{endDate}}
- Location: {{lockerName}}
- Address: {{lockerAddress}}
- Compartment: {{compartmentNumber}}

**How to return:**
1. Go to the locker location
2. Use the same access code: {{accessCode}}
3. Place the item in compartment {{compartmentNumber}}
4. Close the door securely

Late returns may incur additional charges.

Questions? We're here to help!
The Rentbox Team`,
        variables: JSON.stringify(['customerName', 'bookingId', 'endDate', 'lockerName', 'lockerAddress', 'compartmentNumber', 'accessCode']),
      },
      {
        name: 'overdue_notice',
        description: 'Notice sent when rental is overdue',
        type: TemplateType.OVERDUE_NOTICE,
        channel: ConversationChannel.EMAIL,
        subject: '⚠️ Your Rentbox rental is overdue',
        body: `Hi {{customerName}},

Your rental order #{{bookingId}} was due on {{endDate}} and has not been returned.

**Overdue Details:**
- Days Overdue: {{daysOverdue}}
- Late Fee: €{{lateFee}}
- Item: {{productName}}

**Please return immediately to:**
- Location: {{lockerName}}
- Address: {{lockerAddress}}
- Compartment: {{compartmentNumber}}
- Access Code: {{accessCode}}

If you're having trouble returning the item, please contact us immediately.

The Rentbox Team`,
        variables: JSON.stringify(['customerName', 'bookingId', 'endDate', 'daysOverdue', 'lateFee', 'productName', 'lockerName', 'lockerAddress', 'compartmentNumber', 'accessCode']),
      },
      {
        name: 'payment_confirmation',
        description: 'Confirmation sent after successful payment',
        type: TemplateType.PAYMENT_CONFIRMATION,
        channel: ConversationChannel.EMAIL,
        subject: 'Payment confirmed for your Rentbox order ✓',
        body: `Hi {{customerName}},

We've received your payment for order #{{bookingId}}.

**Payment Details:**
- Amount: €{{amount}}
- Payment Method: {{paymentMethod}}
- Transaction ID: {{transactionId}}

Your rental is now confirmed. We'll send you pickup instructions when your item is ready.

Thank you for choosing Rentbox!
The Rentbox Team`,
        variables: JSON.stringify(['customerName', 'bookingId', 'amount', 'paymentMethod', 'transactionId']),
      },
      {
        name: 'sms_pickup_ready',
        description: 'SMS notification when pickup is ready',
        type: TemplateType.PICKUP_INSTRUCTIONS,
        channel: ConversationChannel.SMS,
        body: 'Rentbox: Your order #{{bookingId}} is ready! Pickup at {{lockerName}}, compartment {{compartmentNumber}}. Code: {{accessCode}}',
        variables: JSON.stringify(['bookingId', 'lockerName', 'compartmentNumber', 'accessCode']),
      },
      {
        name: 'sms_return_reminder',
        description: 'SMS reminder before return deadline',
        type: TemplateType.RETURN_REMINDER,
        channel: ConversationChannel.SMS,
        body: 'Rentbox reminder: Please return your rental #{{bookingId}} by {{endDate}}. Return to {{lockerName}}, compartment {{compartmentNumber}}.',
        variables: JSON.stringify(['bookingId', 'endDate', 'lockerName', 'compartmentNumber']),
      },
      {
        name: 'sms_overdue',
        description: 'SMS notice for overdue rentals',
        type: TemplateType.OVERDUE_NOTICE,
        channel: ConversationChannel.SMS,
        body: 'Rentbox: Your rental #{{bookingId}} is overdue! Please return ASAP to avoid additional fees. Need help? Contact us.',
        variables: JSON.stringify(['bookingId']),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Templates created');

  // Create sample Ticket
  await prisma.ticket.create({
    data: {
      title: 'Locker door stuck - cannot retrieve item',
      description: 'Customer reports that compartment A1 at Tallinn Central Station is not opening even with correct access code.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      category: TicketCategory.LOCKER_ISSUE,
      bookingId: booking2.id,
      createdById: customer2.id,
    },
  });

  console.log('✅ Sample ticket created');

  // Create sample conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId: customer1.id,
      bookingId: booking1.id,
      status: 'OPEN',
      currentAgent: 'SUPPORT',
      contextData: { booking_id: booking1.id, source: 'deep_link' },
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        userId: customer1.id,
        role: 'USER',
        content: 'Hi, I just booked a camera and wanted to know what time I can pick it up tomorrow?',
      },
      {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        agentRole: 'SUPPORT',
        content: 'Hello John! Thanks for reaching out. I can see your booking #' + booking1.id + ' for the Sony A7 III Camera is confirmed. The locker is accessible 24/7, so you can pick it up anytime tomorrow. Your access code is RB-123456 and your compartment is ' + tallinnCompartments[0].number + ' at Tallinn Central Station. Is there anything else I can help with?',
        toolCalls: JSON.stringify([{ name: 'get_booking', args: { booking_id: booking1.id } }]),
      },
    ],
  });

  console.log('✅ Sample conversation created');

  // Create Rules for automation
  await prisma.rule.createMany({
    data: [
      {
        name: 'Send pickup instructions on payment',
        description: 'Automatically send pickup instructions when payment is completed',
        triggerType: 'EVENT',
        triggerEvent: 'PAYMENT_COMPLETED',
        actions: JSON.stringify([
          { type: 'send_email', template: 'pickup_instructions' },
          { type: 'send_sms', template: 'sms_pickup_ready' },
        ]),
        isActive: true,
        priority: 10,
      },
      {
        name: 'Return reminder 24h before',
        description: 'Send reminder 24 hours before rental end date',
        triggerType: 'SCHEDULE',
        cronSchedule: '0 9 * * *', // Daily at 9 AM
        conditions: JSON.stringify({
          'booking.status': 'ACTIVE',
          'hoursUntilEnd': { 'lte': 24, 'gte': 0 },
        }),
        actions: JSON.stringify([
          { type: 'send_email', template: 'return_reminder' },
          { type: 'send_sms', template: 'sms_return_reminder' },
        ]),
        isActive: true,
        priority: 5,
      },
      {
        name: 'Overdue notice',
        description: 'Send overdue notice when rental becomes overdue',
        triggerType: 'EVENT',
        triggerEvent: 'BOOKING_OVERDUE',
        actions: JSON.stringify([
          { type: 'send_email', template: 'overdue_notice' },
          { type: 'send_sms', template: 'sms_overdue' },
          { type: 'create_ticket', category: 'RETURN_ISSUE', priority: 'HIGH' },
        ]),
        isActive: true,
        priority: 10,
      },
      {
        name: 'Create ticket on locker failure',
        description: 'Automatically create a ticket when locker open fails',
        triggerType: 'EVENT',
        triggerEvent: 'LOCKER_OPEN_FAILED',
        actions: JSON.stringify([
          { type: 'create_ticket', category: 'LOCKER_ISSUE', priority: 'URGENT' },
          { type: 'notify_ops', message: 'Locker open failed - immediate attention required' },
        ]),
        isActive: true,
        priority: 20,
      },
      {
        name: 'Daily overdue check',
        description: 'Check for overdue bookings daily and mark them',
        triggerType: 'SCHEDULE',
        cronSchedule: '0 0 * * *', // Daily at midnight
        conditions: JSON.stringify({
          'booking.status': 'ACTIVE',
          'booking.endDate': { 'lt': 'now' },
        }),
        actions: JSON.stringify([
          { type: 'update_booking_status', status: 'OVERDUE' },
          { type: 'emit_event', eventType: 'BOOKING_OVERDUE' },
        ]),
        isActive: true,
        priority: 15,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Automation rules created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
