export interface User {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface Locker {
  id: number;
  name: string;
  location: string | null;
  api_type: 'http' | 'mqtt';
  api_url: string | null;
  mqtt_broker: string | null;
  mqtt_topic: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Compartment {
  id: number;
  locker_id: number;
  compartment_number: string;
  status: 'available' | 'occupied' | 'maintenance';
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: number;
  user_id: number;
  product_id: number;
  compartment_id: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  start_time: Date;
  end_time: Date;
  pickup_code: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string | null;
  transaction_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: number;
  event_type: string;
  event_data: Record<string, any>;
  booking_id: number | null;
  user_id: number | null;
  processed: boolean;
  created_at: Date;
}

export interface Message {
  id: number;
  conversation_id: string;
  booking_id: number | null;
  user_id: number | null;
  role: 'user' | 'assistant' | 'support' | 'ops' | 'sales';
  content: string;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface Ticket {
  id: number;
  booking_id: number | null;
  user_id: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AIAction {
  id: number;
  action_type: string;
  booking_id: number | null;
  user_id: number | null;
  ticket_id: number | null;
  reason: string | null;
  outcome: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface Rule {
  id: number;
  name: string;
  event_type: string | null;
  condition: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}
