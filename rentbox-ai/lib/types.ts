// Database entity types

export interface User {
  id: number;
  email: string;
  phone?: string;
  full_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price_per_hour?: number;
  price_per_day?: number;
  category?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Locker {
  id: number;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  total_compartments: number;
  api_endpoint?: string;
  api_type: 'http' | 'mqtt';
  mqtt_topic?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Compartment {
  id: number;
  locker_id: number;
  compartment_number: string;
  size?: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  current_booking_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: number;
  user_id: number;
  product_id: number;
  compartment_id: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'overdue';
  start_time: Date;
  end_time: Date;
  actual_return_time?: Date;
  total_amount: number;
  deposit_amount: number;
  pickup_code?: string;
  return_code?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_type: 'booking' | 'deposit' | 'late_fee' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: string;
  transaction_id?: string;
  payment_provider?: string;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: number;
  event_type: string;
  entity_type?: string;
  entity_id?: number;
  payload: any;
  processed: boolean;
  processed_at?: Date;
  created_at: Date;
}

export interface Message {
  id: number;
  conversation_id: string;
  booking_id?: number;
  user_id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_type?: 'support' | 'ops' | 'sales';
  tool_calls?: any;
  metadata?: any;
  created_at: Date;
}

export interface AIAction {
  id: number;
  action_type: string;
  agent_type?: string;
  booking_id?: number;
  user_id?: number;
  ticket_id?: number;
  reason: string;
  outcome: 'success' | 'failed' | 'skipped';
  outcome_details?: string;
  metadata?: any;
  created_at: Date;
}

export interface Ticket {
  id: number;
  booking_id?: number;
  user_id?: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  category?: string;
  assigned_to?: string;
  resolved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RateLimit {
  id: number;
  user_id: number;
  message_type: 'email' | 'sms';
  count: number;
  window_start: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger_type: 'event' | 'time_based' | 'condition';
  trigger_config: any;
  conditions?: any;
  actions: any;
  active: boolean;
  last_run_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MessageTemplate {
  id: number;
  name: string;
  type: 'email' | 'sms';
  subject?: string;
  body_template: string;
  variables?: string[];
  category?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Extended types with joined data
export interface BookingWithDetails extends Booking {
  user?: User;
  product?: Product;
  compartment?: Compartment & { locker?: Locker };
  payments?: Payment[];
}

export interface TicketWithDetails extends Ticket {
  booking?: BookingWithDetails;
  user?: User;
}
