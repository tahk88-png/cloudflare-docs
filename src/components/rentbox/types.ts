// Rentbox.ee User Dashboard Types

export type RentalStatus = "active" | "upcoming" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "overdue" | "refunded";

export interface LockerLocation {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface Rental {
  id: string;
  lockerNumber: string;
  lockerSize: "small" | "medium" | "large" | "xl";
  location: LockerLocation;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  accessCode?: string; // Only shown for active/upcoming rentals
  price: number;
  currency: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  rentalId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  downloadUrl: string;
}

export interface Agreement {
  id: string;
  rentalId: string;
  title: string;
  signedDate: string;
  downloadUrl: string;
  viewUrl: string;
}

export interface DashboardData {
  user: {
    name: string;
    email: string;
  };
  stats: {
    activeRentals: number;
    totalRentals: number;
    totalSpent: number;
    currency: string;
  };
  rentals: Rental[];
  invoices: Invoice[];
  agreements: Agreement[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BookingsResponse {
  rentals: Rental[];
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export type DashboardResponse = DashboardData;
