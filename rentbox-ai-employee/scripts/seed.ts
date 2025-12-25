import { db } from '../lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  try {
    console.log('Seeding database...');

    // Users
    const user1 = await db.query(
      `INSERT INTO users (email, name, phone) VALUES ($1, $2, $3) RETURNING id`,
      ['john.doe@example.com', 'John Doe', '+1234567890']
    );
    const user1Id = user1.rows[0].id;

    const user2 = await db.query(
      `INSERT INTO users (email, name, phone) VALUES ($1, $2, $3) RETURNING id`,
      ['jane.smith@example.com', 'Jane Smith', '+0987654321']
    );
    const user2Id = user2.rows[0].id;

    console.log('✓ Users created');

    // Products
    const product1 = await db.query(
      `INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING id`,
      ['Standard Locker Rental', '24-hour locker rental', 5.99]
    );
    const product1Id = product1.rows[0].id;

    const product2 = await db.query(
      `INSERT INTO products (name, description, price) VALUES ($1, $2, $3) RETURNING id`,
      ['Premium Locker Rental', '48-hour locker rental with priority support', 9.99]
    );
    const product2Id = product2.rows[0].id;

    console.log('✓ Products created');

    // Lockers
    const locker1 = await db.query(
      `INSERT INTO lockers (name, location, api_type, api_url) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Main Street Locker', '123 Main St, City', 'http', 'http://localhost:3001/api/locker']
    );
    const locker1Id = locker1.rows[0].id;

    const locker2 = await db.query(
      `INSERT INTO lockers (name, location, api_type, api_url) VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Park Avenue Locker', '456 Park Ave, City', 'http', 'http://localhost:3001/api/locker']
    );
    const locker2Id = locker2.rows[0].id;

    console.log('✓ Lockers created');

    // Compartments
    const compartments = [];
    for (let i = 1; i <= 10; i++) {
      const comp = await db.query(
        `INSERT INTO compartments (locker_id, compartment_number, status) VALUES ($1, $2, $3) RETURNING id`,
        [locker1Id, `A${i}`, i <= 5 ? 'available' : 'occupied']
      );
      compartments.push(comp.rows[0].id);
    }

    for (let i = 1; i <= 10; i++) {
      await db.query(
        `INSERT INTO compartments (locker_id, compartment_number, status) VALUES ($1, $2, $3) RETURNING id`,
        [locker2Id, `B${i}`, 'available']
      );
    }

    console.log('✓ Compartments created');

    // Bookings
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(10, 0, 0, 0);

    const booking1 = await db.query(
      `INSERT INTO bookings (user_id, product_id, compartment_id, status, start_time, end_time, pickup_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [user1Id, product1Id, compartments[0], 'confirmed', startTime, endTime, 'ABC123']
    );
    const booking1Id = booking1.rows[0].id;

    const booking2 = await db.query(
      `INSERT INTO bookings (user_id, product_id, compartment_id, status, start_time, end_time, pickup_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [user2Id, product2Id, compartments[1], 'active', startTime, endTime, 'XYZ789']
    );
    const booking2Id = booking2.rows[0].id;

    console.log('✓ Bookings created');

    // Payments
    await db.query(
      `INSERT INTO payments (booking_id, amount, status, payment_method, transaction_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking1Id, 5.99, 'completed', 'card', 'txn_123456']
    );

    await db.query(
      `INSERT INTO payments (booking_id, amount, status, payment_method, transaction_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [booking2Id, 9.99, 'completed', 'card', 'txn_789012']
    );

    console.log('✓ Payments created');

    // Sample events
    await db.query(
      `INSERT INTO events (event_type, event_data, booking_id, user_id, processed)
       VALUES ($1, $2, $3, $4, false)`,
      ['payment', { status: 'completed', amount: 5.99 }, booking1Id, user1Id]
    );

    await db.query(
      `INSERT INTO events (event_type, event_data, booking_id, user_id, processed)
       VALUES ($1, $2, $3, $4, false)`,
      ['booking_confirmed', { booking_id: booking1Id }, booking1Id, user1Id]
    );

    console.log('✓ Events created');

    // Sample rules
    await db.query(
      `INSERT INTO rules (name, event_type, condition, action_type, action_config, enabled)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [
        'Send pickup instructions on booking confirmation',
        'booking_confirmed',
        JSON.stringify({ type: 'equals', field: 'event_type', value: 'booking_confirmed' }),
        'send_email',
        JSON.stringify({ template_name: 'pickup_instructions' }),
      ]
    );

    await db.query(
      `INSERT INTO rules (name, event_type, condition, action_type, action_config, enabled)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [
        'Create ticket on repeated open failures',
        'open_failed',
        JSON.stringify({ type: 'equals', field: 'event_type', value: 'open_failed' }),
        'create_ticket',
        JSON.stringify({
          title: 'Locker open failure - Booking #{{booking_id}}',
          description: 'Customer unable to open locker',
          priority: 'high',
        }),
      ]
    );

    console.log('✓ Rules created');

    console.log('\n✅ Seed data created successfully!');
    console.log('\nSample data:');
    console.log(`- Users: ${user1Id}, ${user2Id}`);
    console.log(`- Bookings: ${booking1Id}, ${booking2Id}`);
    console.log(`- Lockers: ${locker1Id}, ${locker2Id}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
