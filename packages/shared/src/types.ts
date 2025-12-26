export interface Product {
  id: string;
  slug: string;
  name: string;
  pricing: {
    hourly: number;
    daily: number;
    weekly: number;
  };
  deposit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'PAID' | 'ACTIVE' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';
  compartmentId: string;
  productId: string;
  lockerId: string;
  product?: Product;
  compartment?: { id: string; code: string };
  locker?: { id: string; name: string; location: string };
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  title: string;
  bookingId?: string;
  lockerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemFlag {
  key: string;
  enabled: boolean;
}

export interface HealthStatus {
  overall: 'ok' | 'degraded' | 'down';
  services: {
    db: string;
    redis: string;
    sms: string;
    payments: string;
    locker: string;
  };
}
