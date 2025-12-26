// ============================================================================
// Rentbox v2 - Shared Types
// ============================================================================

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'active',
  'completed',
  'overdue',
  'cancelled',
  'expired',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DEPOSIT_STATUSES = [
  'pending',
  'held',
  'released',
  'captured',
  'refunded',
] as const;

export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const SIGNATURE_TYPES = [
  'typed',
  'smart_id',
  'mobile_id',
  'id_card',
] as const;

export type SignatureType = (typeof SIGNATURE_TYPES)[number];

export const USER_TYPES = ['individual', 'business', 'operator'] as const;

export type UserType = (typeof USER_TYPES)[number];

export const COMPARTMENT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;

export type CompartmentSize = (typeof COMPARTMENT_SIZES)[number];

export const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'push'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  externalId?: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  personalCode?: string;
  companyName?: string;
  companyRegNr?: string;
  userType: UserType;
  status: 'active' | 'suspended' | 'pending_verification';
  emailVerified: boolean;
  phoneVerified: boolean;
  locale: string;
  timezone: string;
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  lastLoginAt?: Date;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push?: boolean;
}

// ============================================================================
// LOCATION & LOCKER TYPES
// ============================================================================

export interface Location {
  id: string;
  code: string;
  name: string;
  slug: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  operatingHours: OperatingHours;
  is24h: boolean;
  status: 'active' | 'maintenance' | 'inactive';
  contactPhone?: string;
  contactEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string; // "08:00"
  close: string; // "22:00"
}

export interface Locker {
  id: string;
  locationId: string;
  code: string;
  serialNumber?: string;
  hardwareType: string;
  firmwareVersion?: string;
  lastHeartbeat?: Date;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Compartment {
  id: string;
  lockerId: string;
  number: number;
  code: string;
  size: CompartmentSize;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'blocked';
  isDoorOpen: boolean;
  lastOpenedAt?: Date;
  lastClosedAt?: Date;
  assignedProductId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Category {
  id: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  specifications: Record<string, string>;
  images: ProductImage[];
  videos: ProductVideo[];
  documents: ProductDocument[];
  pricing: ProductPricing;
  rentalRules: RentalRules;
  weightKg?: number;
  compartmentSize: CompartmentSize;
  status: 'active' | 'inactive' | 'discontinued';
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ProductImage {
  url: string;
  urlThumb?: string;
  alt: string;
  isPrimary?: boolean;
}

export interface ProductVideo {
  type: 'youtube' | 'vimeo' | 'direct';
  url: string;
  title?: string;
}

export interface ProductDocument {
  type: 'manual' | 'safety' | 'warranty' | 'other';
  name: string;
  url: string;
  sizeKb?: number;
}

export interface ProductPricing {
  hourlyRate: number;
  dailyRate: number;
  weeklyRate?: number;
  depositAmount: number;
  currency: 'EUR';
}

export interface RentalRules {
  minRentalHours: number;
  maxRentalDays: number;
  bufferMinutes: number;
  requiresDeposit: boolean;
  requiresIdVerification: boolean;
  minAge: number;
  requiresTraining: boolean;
}

export interface ProductInventory {
  id: string;
  productId: string;
  locationId: string;
  serialNumber?: string;
  assetTag?: string;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  compartmentId?: string;
  lastInspection?: Date;
  nextInspection?: Date;
  maintenanceNotes?: string;
  totalRentals: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

export interface Booking {
  id: string;
  bookingNumber: string;
  userId: string;
  productId: string;
  inventoryId: string;
  locationId: string;
  compartmentId: string;
  startAt: Date;
  endAt: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  status: BookingStatus;
  hourlyRate: number;
  dailyRate: number;
  subtotal: number;
  depositAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: 'EUR';
  extensionCharges: number;
  overdueCharges: number;
  damageCharges: number;
  depositStatus: DepositStatus;
  paymentStatus: PaymentStatus;
  contractSignedAt?: Date;
  contractHash?: string;
  signatureType?: SignatureType;
  source: 'web' | 'mobile' | 'admin' | 'api';
  notes?: string;
  adminNotes?: string;
  metadata: Record<string, unknown>;
  expiresAt?: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface BookingWithRelations extends Booking {
  user: User;
  product: Product;
  inventory: ProductInventory;
  location: Location;
  compartment: Compartment & { locker: Locker };
}

export interface BookingExtension {
  id: string;
  bookingId: string;
  originalEndAt: Date;
  newEndAt: Date;
  additionalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  createdAt: Date;
}

export interface BookingStatusHistory {
  id: number;
  bookingId: string;
  fromStatus?: BookingStatus;
  toStatus: BookingStatus;
  reason?: string;
  triggeredBy: 'user' | 'system' | 'admin' | 'payment' | 'locker';
  userId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface Payment {
  id: string;
  bookingId: string;
  externalId?: string;
  provider: 'stripe' | 'everypay' | 'bank_transfer' | 'cash';
  type: 'rental' | 'deposit' | 'extension' | 'overdue' | 'damage';
  amount: number;
  currency: 'EUR';
  status: PaymentStatus;
  authorizedAt?: Date;
  capturedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  failureCode?: string;
  failureMessage?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  externalId?: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  processedAt?: Date;
  processedBy?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  bookingId: string;
  userId: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: 'EUR';
  status: 'draft' | 'issued' | 'paid' | 'void' | 'overdue';
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  pdfUrl?: string;
  lineItems: InvoiceLineItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// ============================================================================
// LOCKER ACCESS TYPES
// ============================================================================

export interface AccessToken {
  id: string;
  bookingId: string;
  compartmentId: string;
  tokenHash: string;
  tokenType: 'pin' | 'qr' | 'nfc' | 'app';
  validFrom: Date;
  validUntil: Date;
  maxUses: number;
  useCount: number;
  lastUsedAt?: Date;
  status: 'active' | 'used' | 'expired' | 'revoked';
  createdAt: Date;
}

export interface LockerEvent {
  id: number;
  lockerId: string;
  compartmentId?: string;
  bookingId?: string;
  userId?: string;
  eventType: LockerEventType;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  hardwareState: Record<string, unknown>;
  triggeredBy: 'user' | 'system' | 'admin' | 'hardware' | 'scheduled';
  requestId?: string;
  createdAt: Date;
}

export type LockerEventType =
  | 'door_open_requested'
  | 'door_open_authorized'
  | 'door_open_denied'
  | 'door_opening'
  | 'door_opened'
  | 'door_open_failed'
  | 'door_open_timeout'
  | 'door_closed'
  | 'door_left_open_warning'
  | 'door_forced_open'
  | 'access_granted'
  | 'access_denied'
  | 'pin_entered'
  | 'pin_failed'
  | 'token_validated'
  | 'token_rejected'
  | 'heartbeat'
  | 'online'
  | 'offline'
  | 'error'
  | 'maintenance_start'
  | 'maintenance_end'
  | 'firmware_update';

// ============================================================================
// INCIDENT TYPES
// ============================================================================

export interface Incident {
  id: string;
  incidentNumber: string;
  bookingId?: string;
  lockerId?: string;
  compartmentId?: string;
  userId?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: 'open' | 'investigating' | 'pending_action' | 'resolved' | 'closed';
  title: string;
  description: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  assignedTo?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export type IncidentType =
  | 'locker_malfunction'
  | 'door_stuck'
  | 'payment_mismatch'
  | 'tool_damaged'
  | 'tool_missing'
  | 'unauthorized_access'
  | 'customer_complaint'
  | 'overdue_unresolved';

export interface IncidentComment {
  id: string;
  incidentId: string;
  userId: string;
  comment: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: Date;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  emailSubject?: string;
  emailBodyHtml?: string;
  emailBodyText?: string;
  smsBody?: string;
  variables: string[];
  sendDelayMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  bookingId?: string;
  templateId?: string;
  channel: NotificationChannel;
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  body: string;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
  externalId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// CONTRACT TYPES
// ============================================================================

export interface ContractTemplate {
  id: string;
  code: string;
  name: string;
  contentHtml: string;
  contentText: string;
  variables: string[];
  requiresStrongAuth: boolean;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: string;
  bookingId: string;
  userId: string;
  templateId: string;
  contentHtml: string;
  contentText: string;
  signatureType: SignatureType;
  signatureValue?: string;
  signerName: string;
  signerPersonalCode?: string;
  contentHash: string;
  signatureHash: string;
  signedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  pdfUrl?: string;
  createdAt: Date;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestedAction?: string;
  alternatives?: unknown[];
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: Record<string, unknown>;
}

export type WebhookEventType =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.started'
  | 'booking.completed'
  | 'booking.overdue'
  | 'booking.cancelled'
  | 'booking.extended'
  | 'locker.door_opened'
  | 'locker.door_closed'
  | 'locker.offline'
  | 'locker.online'
  | 'incident.created'
  | 'incident.resolved';

// ============================================================================
// AVAILABILITY TYPES
// ============================================================================

export interface AvailabilityRequest {
  productId: string;
  locationId: string;
  startAt: string;
  endAt: string;
}

export interface AvailabilityResponse {
  available: boolean;
  productId: string;
  locationId: string;
  requestedWindow: {
    startAt: string;
    endAt: string;
    durationHours: number;
  };
  compartment?: {
    id: string;
    code: string;
    lockerCode: string;
  };
  pricingEstimate?: PricingEstimate;
  conflict?: AvailabilityConflict;
  alternatives?: AlternativeSlot[];
}

export interface AvailabilityConflict {
  type: 'booking_exists' | 'maintenance' | 'no_inventory';
  blockedFrom?: string;
  blockedUntil?: string;
  message: string;
}

export interface AlternativeSlot {
  startAt: string;
  endAt: string;
  available: boolean;
  location?: {
    id: string;
    name: string;
  };
}

export interface PricingEstimate {
  calculationType: 'hourly' | 'daily' | 'weekly';
  breakdown: PricingBreakdown[];
  subtotal: number;
  deposit: number;
  tax: number;
  total: number;
  currency: 'EUR';
}

export interface PricingBreakdown {
  description: string;
  amount: number;
}
