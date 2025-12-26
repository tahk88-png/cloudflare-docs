// ============================================================================
// CORE TYPES
// ============================================================================

export type BookingStatus = 
  | 'PENDING'
  | 'PAID'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'EXPIRED';

export type CompartmentSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH';

export type IncidentSeverity = 'P1' | 'P2' | 'P3' | 'P4';

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'ADMIN' | 'OPERATOR' | 'TECHNICIAN' | 'CUSTOMER';
  preferredLanguage: string;
  timezone: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: string;
  model?: string;
  description: string;
  shortDescription?: string;
  category: Category;
  specifications?: Record<string, string>;
  pricing: ProductPricing;
  images: ProductImage[];
  requiredCompartmentSize: CompartmentSize;
  minRentalHours: number;
  maxRentalDays: number;
  requiresTraining: boolean;
}

export interface ProductPricing {
  hourly: string;
  daily: string;
  weekly?: string;
  deposit: string;
  currency: string;
}

export interface ProductImage {
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent?: Category;
}

// ============================================================================
// LOCATION & LOCKER TYPES
// ============================================================================

export interface Location {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  operatingHours: Record<string, { open: string; close: string } | null>;
  isActive: boolean;
}

export interface Locker {
  id: string;
  externalId: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
  location: Location;
  compartments: Compartment[];
}

export interface Compartment {
  id: string;
  number: number;
  size: CompartmentSize;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  isOpen: boolean;
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  product: Product;
  compartment: {
    id: string;
    number: number;
    lockerName: string;
  };
  location: Location;
  schedule: BookingSchedule;
  pricing: BookingPricing;
  accessPin?: string;
  accessAttempts: number;
  contract?: Contract;
  createdAt: string;
}

export interface BookingSchedule {
  startAt: string;
  endAt: string;
  originalEndAt?: string;
  actualReturnAt?: string;
  durationHours: number;
  timezone: string;
}

export interface BookingPricing {
  subtotal: string;
  taxAmount: string;
  deposit: string;
  total: string;
  lateFeeAmount?: string;
  currency: string;
}

export interface CreateBookingRequest {
  productId: string;
  compartmentId: string;
  startAt: string;
  endAt: string;
  timezone?: string;
}

export interface BookingExtension {
  id: string;
  bookingId: string;
  previousEndAt: string;
  newEndAt: string;
  additionalAmount: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

// ============================================================================
// AVAILABILITY TYPES
// ============================================================================

export interface AvailabilityResponse {
  isAvailable: boolean;
  productId: string;
  locationId: string;
  requestedSlot: {
    startAt: string;
    endAt: string;
  };
  availableCompartments?: AvailableCompartment[];
  pricing?: BookingPricing;
  alternatives?: AlternativeSlot[];
  otherLocations?: AlternativeLocation[];
}

export interface AvailableCompartment {
  compartmentId: string;
  lockerName: string;
  compartmentNumber: number;
  size: CompartmentSize;
}

export interface AlternativeSlot {
  startAt: string;
  endAt: string;
  compartmentId: string;
  isSameDuration: boolean;
}

export interface AlternativeLocation {
  locationId: string;
  locationName: string;
  isAvailable: boolean;
  distanceKm?: number;
}

export interface CalendarDay {
  date: string;
  isOperating: boolean;
  operatingHours?: { open: string; close: string };
  availability: 'FULL' | 'PARTIAL' | 'NONE';
  availableSlots?: TimeSlot[];
  bookedSlots?: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

// ============================================================================
// CHECKOUT TYPES
// ============================================================================

export interface CheckoutSession {
  checkoutId: string;
  bookingId: string;
  steps: CheckoutStep[];
  expiresAt: string;
}

export interface CheckoutStep {
  step: number;
  name: 'REVIEW' | 'TERMS' | 'PAYMENT' | 'CONFIRMATION';
  status: 'COMPLETED' | 'CURRENT' | 'PENDING';
  data?: Record<string, any>;
}

export interface Contract {
  id: string;
  contentHtml: string;
  contentPlain: string;
  keyTerms: string[];
  signatureRequirement: {
    method: 'TYPED' | 'SMART_ID' | 'MOBILE_ID' | 'ID_CARD';
    reason: string;
    alternativeMethods?: string[];
  };
  status: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'VOIDED';
  signedAt?: string;
  contentHash?: string;
}

export interface PaymentIntent {
  paymentId: string;
  status: 'REQUIRES_ACTION' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  clientSecret?: string;
  nextAction?: {
    type: 'REDIRECT_TO_URL' | 'CONFIRM_CARD' | 'BANK_TRANSFER';
    url?: string;
  };
}

// ============================================================================
// LOCKER ACCESS TYPES
// ============================================================================

export interface LockerOpenResponse {
  success: boolean;
  eventId?: string;
  compartmentId?: string;
  lockerName?: string;
  compartmentNumber?: number;
  status?: 'OPENED' | 'FAILED';
  message: string;
  autoCloseSeconds?: number;
  code?: string;
  action?: string;
  fallback?: {
    type: 'PIN' | 'SMS_PIN';
    pin?: string;
    instructions: string;
  };
  details?: {
    attempt?: number;
    attemptsRemaining?: number;
  };
}

export interface AccessPin {
  pin: string;
  validUntil: string;
  instructions: string;
  location: {
    lockerName: string;
    compartment: number;
    address: string;
  };
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationPreferences {
  email: string;
  phone?: string;
  preferences: Record<string, Record<NotificationChannel, boolean>>;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

// ============================================================================
// INCIDENT TYPES
// ============================================================================

export interface Incident {
  id: string;
  incidentNumber: string;
  type: string;
  severity: IncidentSeverity;
  status: 'OPEN' | 'INVESTIGATING' | 'PENDING_ACTION' | 'ESCALATED' | 'RESOLVED' | 'ARCHIVED';
  title: string;
  description: string;
  booking?: Booking;
  createdAt: string;
  resolvedAt?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    action?: string;
    details?: Record<string, any>;
    alternatives?: any[];
    fallback?: any;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
