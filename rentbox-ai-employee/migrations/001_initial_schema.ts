import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Users table
  pgm.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    name: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Products table
  pgm.createTable('products', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    price: { type: 'decimal(10, 2)', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Lockers table
  pgm.createTable('lockers', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    location: { type: 'varchar(500)' },
    api_type: { type: 'varchar(50)', default: 'http' },
    api_url: { type: 'varchar(500)' },
    mqtt_broker: { type: 'varchar(500)' },
    mqtt_topic: { type: 'varchar(255)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Compartments table
  pgm.createTable('compartments', {
    id: { type: 'serial', primaryKey: true },
    locker_id: { type: 'integer', notNull: true, references: 'lockers(id)', onDelete: 'CASCADE' },
    compartment_number: { type: 'varchar(50)', notNull: true },
    status: { type: 'varchar(50)', default: 'available' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('compartments', 'compartments_locker_compartment_unique', {
    unique: ['locker_id', 'compartment_number'],
  });

  // Bookings table
  pgm.createTable('bookings', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    product_id: { type: 'integer', notNull: true, references: 'products(id)', onDelete: 'CASCADE' },
    compartment_id: { type: 'integer', notNull: true, references: 'compartments(id)', onDelete: 'CASCADE' },
    status: { type: 'varchar(50)', default: 'pending' },
    start_time: { type: 'timestamp', notNull: true },
    end_time: { type: 'timestamp', notNull: true },
    pickup_code: { type: 'varchar(50)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Payments table
  pgm.createTable('payments', {
    id: { type: 'serial', primaryKey: true },
    booking_id: { type: 'integer', notNull: true, references: 'bookings(id)', onDelete: 'CASCADE' },
    amount: { type: 'decimal(10, 2)', notNull: true },
    status: { type: 'varchar(50)', default: 'pending' },
    payment_method: { type: 'varchar(50)' },
    transaction_id: { type: 'varchar(255)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Events table
  pgm.createTable('events', {
    id: { type: 'serial', primaryKey: true },
    event_type: { type: 'varchar(100)', notNull: true },
    event_data: { type: 'jsonb', notNull: true },
    booking_id: { type: 'integer', references: 'bookings(id)', onDelete: 'SET NULL' },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    processed: { type: 'boolean', default: false },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Messages table
  pgm.createTable('messages', {
    id: { type: 'serial', primaryKey: true },
    conversation_id: { type: 'varchar(255)', notNull: true },
    booking_id: { type: 'integer', references: 'bookings(id)', onDelete: 'SET NULL' },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    role: { type: 'varchar(50)', notNull: true },
    content: { type: 'text', notNull: true },
    metadata: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Tickets table
  pgm.createTable('tickets', {
    id: { type: 'serial', primaryKey: true },
    booking_id: { type: 'integer', references: 'bookings(id)', onDelete: 'SET NULL' },
    user_id: { type: 'integer', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    status: { type: 'varchar(50)', default: 'open' },
    priority: { type: 'varchar(50)', default: 'medium' },
    assigned_to: { type: 'varchar(255)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // AI Actions table
  pgm.createTable('ai_actions', {
    id: { type: 'serial', primaryKey: true },
    action_type: { type: 'varchar(100)', notNull: true },
    booking_id: { type: 'integer', references: 'bookings(id)', onDelete: 'SET NULL' },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
    ticket_id: { type: 'integer', references: 'tickets(id)', onDelete: 'SET NULL' },
    reason: { type: 'text' },
    outcome: { type: 'text' },
    metadata: { type: 'jsonb' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Rules table
  pgm.createTable('rules', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    event_type: { type: 'varchar(100)' },
    condition: { type: 'jsonb', notNull: true },
    action_type: { type: 'varchar(100)', notNull: true },
    action_config: { type: 'jsonb', notNull: true },
    enabled: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Rate limits table
  pgm.createTable('rate_limits', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'integer', references: 'users(id)', onDelete: 'CASCADE' },
    action_type: { type: 'varchar(100)', notNull: true },
    count: { type: 'integer', default: 1 },
    window_start: { type: 'timestamp', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('rate_limits', 'rate_limits_unique', {
    unique: ['user_id', 'action_type', 'window_start'],
  });

  // Indexes
  pgm.createIndex('bookings', 'user_id');
  pgm.createIndex('bookings', 'compartment_id');
  pgm.createIndex('bookings', 'status');
  pgm.createIndex('payments', 'booking_id');
  pgm.createIndex('payments', 'status');
  pgm.createIndex('events', 'processed');
  pgm.createIndex('events', 'event_type');
  pgm.createIndex('events', 'booking_id');
  pgm.createIndex('messages', 'conversation_id');
  pgm.createIndex('messages', 'booking_id');
  pgm.createIndex('ai_actions', 'booking_id');
  pgm.createIndex('ai_actions', 'action_type');
  pgm.createIndex('tickets', 'status');
  pgm.createIndex('tickets', 'user_id');
  pgm.createIndex('rate_limits', 'user_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('rate_limits');
  pgm.dropTable('rules');
  pgm.dropTable('ai_actions');
  pgm.dropTable('tickets');
  pgm.dropTable('messages');
  pgm.dropTable('events');
  pgm.dropTable('payments');
  pgm.dropTable('bookings');
  pgm.dropTable('compartments');
  pgm.dropTable('lockers');
  pgm.dropTable('products');
  pgm.dropTable('users');
}
