import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('message_templates', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true, unique: true },
    type: { type: 'varchar(50)', notNull: true }, // 'email' or 'sms'
    subject: { type: 'varchar(500)' },
    content: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Insert default templates
  pgm.sql(`
    INSERT INTO message_templates (name, type, subject, content) VALUES
    ('pickup_instructions', 'email', 'Your Rentbox Pickup Instructions', 
     'Hello {{user_name}},\n\nYour booking #{{booking_id}} is ready for pickup!\n\nPickup Code: {{pickup_code}}\nLocation: {{locker_location}}\nCompartment: {{compartment_number}}\n\nYou can pick up your item between {{start_time}} and {{end_time}}.\n\nThank you for using Rentbox!'),
    ('reminder_24h', 'email', 'Reminder: Your Rentbox Booking Ends Tomorrow',
     'Hello {{user_name}},\n\nThis is a reminder that your booking #{{booking_id}} ends tomorrow at {{end_time}}.\n\nPlease make sure to pick up your item before the end time.\n\nThank you!'),
    ('overdue_notice', 'email', 'Action Required: Overdue Booking',
     'Hello {{user_name}},\n\nYour booking #{{booking_id}} has passed its end time. Please contact us immediately to arrange pickup.\n\nThank you.'),
    ('pickup_sms', 'sms', NULL,
     'Rentbox: Your booking #{{booking_id}} is ready! Pickup code: {{pickup_code}}. Location: {{locker_location}}')
    ON CONFLICT (name) DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('message_templates');
}
