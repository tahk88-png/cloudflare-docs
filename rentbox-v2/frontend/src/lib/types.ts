// Booking types
export interface Booking {
  id: string;
  userId: string;
  productId: string;
  compartmentId: string;
  startAt: string;
  endAt: string;
  status: 'pending' | 'paid' | 'active' | 'completed' | 'cancelled' | 'overdue' | 'expired';
  totalPrice: number;
  depositAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  compartment?: Compartment;
  payments?: BookingPayment[];
  contract?: Contract;
  return?: Return;
}

export interface BookingPayment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  paymentIntentId?: string;
  paymentMethod?: string;
  paidAt?: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId?: string;
  images: string[];
  seoTitle?: string;
  seoDescription?: string;
  status: string;
  pricing?: ProductPricing[];
}

export interface ProductPricing {
  id: string;
  productId: string;
  durationType: 'hour' | 'day' | 'week';
  price: number;
  deposit: number;
  currency: string;
}

// Compartment types
export interface Compartment {
  id: string;
  lockerId: string;
  number: string;
  size?: string;
  status: string;
  locker?: Locker;
}

export interface Locker {
  id: string;
  name: string;
  locationAddress: string;
  locationLat?: number;
  locationLng?: number;
  status: string;
}

// Contract types
export interface Contract {
  id: string;
  bookingId: string;
  termsVersion: number;
  signatureType: 'typed' | 'smart_id' | 'mobiil_id' | 'id_card';
  signatureData?: any;
  contractHash: string;
  signedAt: string;
}

// Return types
export interface Return {
  id: string;
  bookingId: string;
  returnedAt: string;
  confirmedByUserAt?: string;
  confirmedByAdminAt?: string;
  status: string;
  notes?: string;
  photos?: ReturnPhoto[];
}

export interface ReturnPhoto {
  id: string;
  returnId: string;
  url: string;
  uploadedAt: string;
}

// Calendar types
export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
  available: boolean;
}

export interface AvailabilityResponse {
  slots: AvailabilitySlot[];
}
