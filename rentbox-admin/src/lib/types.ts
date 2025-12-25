import type { 
  User, 
  Booking, 
  Product, 
  Category, 
  Locker, 
  Compartment,
  AuditLog,
  Tag,
  ProductImage,
  UserRole,
  BookingStatus,
  PaymentStatus,
  PriceUnit
} from "@prisma/client";

// Re-export Prisma types
export type {
  User,
  Booking,
  Product,
  Category,
  Locker,
  Compartment,
  AuditLog,
  Tag,
  ProductImage,
  UserRole,
  BookingStatus,
  PaymentStatus,
  PriceUnit
};

// Extended types with relations
export type ProductWithRelations = Product & {
  category: Category;
  tags: { tag: Tag }[];
  images: ProductImage[];
  compartments: Compartment[];
};

export type CompartmentWithRelations = Compartment & {
  locker: Locker;
  product: Product | null;
  bookings?: Booking[];
};

export type BookingWithRelations = Booking & {
  user: User | null;
  product: Product;
  compartment: CompartmentWithRelations;
};

export type LockerWithRelations = Locker & {
  compartments: Compartment[];
};

export type AuditLogWithRelations = AuditLog & {
  actor: User | null;
};

// Session types
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type Session = {
  user: SessionUser;
  expires: Date;
};

// Form types
export type ProductFormData = {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  categoryId: string;
  basePrice: number;
  priceUnit: PriceUnit;
  slotMinutes: number;
  minRentalMinutes: number;
  maxRentalMinutes?: number | null;
  active: boolean;
  tagIds?: string[];
  images?: { url: string; alt?: string; order: number; isPrimary: boolean }[];
};

export type CategoryFormData = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order: number;
  active: boolean;
};

export type LockerFormData = {
  name: string;
  locationText: string;
  timezone: string;
  active: boolean;
};

export type CompartmentFormData = {
  lockerId: string;
  label: string;
  productId?: string | null;
  active: boolean;
  notes?: string;
};

export type BookingFormData = {
  userId?: string | null;
  productId: string;
  compartmentId: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  notes?: string;
};

export type UserFormData = {
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  password?: string;
};

// API Response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
};

// Pagination
export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Filter types
export type BookingFilters = {
  status?: BookingStatus;
  lockerId?: string;
  productId?: string;
  compartmentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

export type ProductFilters = {
  categoryId?: string;
  active?: boolean;
  search?: string;
};

// Dashboard types
export type DashboardStats = {
  todayBookings: number;
  upcoming24hBookings: number;
  activeProducts: number;
  activeCompartments: number;
  disabledCompartments: number;
};

export type DashboardAlert = {
  type: "conflict" | "fully_booked" | "payment_pending" | "maintenance";
  message: string;
  entityId?: string;
  entityType?: string;
  severity: "info" | "warning" | "error";
};
