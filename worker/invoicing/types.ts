export type Role = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  emailSettings: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
  };
  invoiceSettings: {
    nextNumber: number; // For simple incrementing, though we might compute it
    prefix: string; // e.g. "2025-"
    dateFormat: string;
    currency: string;
  };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  name: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  address?: string;
  vatNumber?: string;
  paymentTermsDays: number;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: 0 | 9 | 22; // Configurable VAT rates
  amount: number; // quantity * unitPrice
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  number: string; // YYYY-000001
  issueDate: string; // ISO date
  dueDate: string; // ISO date
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  vatTotal: number;
  total: number;
  currency: string;
  notes?: string;
  
  // PDF Data
  pdfUrl?: string;
  pdfSha256?: string; // Immutable hash
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
  sentAt?: string;
  paidAt?: string;
  viewedAt?: string;
}

export type EmailStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'BOUNCED' | 'FAILED';

export interface EmailLog {
  id: string;
  invoiceId: string;
  tenantId: string;
  recipient: string;
  subject: string;
  status: EmailStatus;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: 'INVOICE' | 'CUSTOMER' | 'SETTINGS';
  resourceId: string;
  details?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ViewToken {
  token: string;
  invoiceId: string;
  expiresAt: string;
  createdAt: string;
}
