// Core types for Rentbox Dashboard

export type RentalStatus = 'active' | 'upcoming' | 'completed' | 'cancelled';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type PaymentMethod = 'card' | 'bank_transfer' | 'cash';

export interface Rental {
  id: string;
  itemName: string;
  itemType: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  lockerLocation?: string;
  lockerCode?: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  rentalId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  downloadUrl: string;
}

export interface Agreement {
  id: string;
  rentalId: string;
  agreementNumber: string;
  signedDate: string;
  documentUrl: string;
  documentType: 'rental_agreement' | 'terms_conditions';
}

export interface DashboardSummary {
  activeRentalsCount: number;
  upcomingRentalsCount: number;
  pendingInvoicesCount: number;
  totalSpent: number;
  currency: string;
}

export interface UserDashboard {
  summary: DashboardSummary;
  activeRentals: Rental[];
  upcomingRentals: Rental[];
  recentInvoices: Invoice[];
}

export interface BookingsResponse {
  active: Rental[];
  upcoming: Rental[];
  past: Rental[];
}

export interface InvoicesResponse {
  invoices: Invoice[];
  agreements: Agreement[];
}
