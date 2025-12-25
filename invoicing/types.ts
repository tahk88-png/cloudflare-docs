// TypeScript types for the invoicing system

export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer';
export type InvoiceType = 'invoice' | 'credit_note';
export type InvoiceStatus = 'draft' | 'sent' | 'payment_pending' | 'paid' | 'overdue' | 'cancelled' | 'void';
export type EmailStatus = 'queued' | 'sending' | 'sent' | 'bounced' | 'failed';
export type PaymentProvider = 'stripe' | 'montonio' | 'bank_transfer' | 'cash';
export type ReminderType = 'before_due' | 'on_due' | 'overdue';

export interface Company {
  id: string;
  name: string;
  email: string;
  vat_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  logo_url?: string;
  default_vat_rate: number;
  default_payment_terms: number;
  invoice_prefix?: string;
  settings?: CompanySettings;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  email_from?: string;
  email_reply_to?: string;
  email_provider?: string;
  reminder_enabled?: boolean;
  reminder_days_before?: number[];
  reminder_days_after?: number[];
  payment_methods?: PaymentProvider[];
  stripe_api_key?: string;
  montonio_api_key?: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  email: string;
  vat_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  payment_terms: number;
  reminder_settings?: ReminderSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderSettings {
  enabled: boolean;
  days_before?: number[]; // e.g., [7, 3, 1]
  days_after?: number[];  // e.g., [1, 7, 14]
}

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  parent_invoice_id?: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  currency: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  paid_amount: number;
  pdf_url?: string;
  pdf_sha256?: string;
  pdf_generated_at?: string;
  is_pdf_final: boolean;
  payment_method?: PaymentProvider;
  payment_reference?: string;
  payment_link?: string;
  reminder_settings?: ReminderSettings;
  last_reminder_sent_at?: string;
  reminder_count: number;
  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  sent_at?: string;
  viewed_at?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  subtotal: number;
  vat_amount: number;
  total: number;
  sort_order: number;
  created_at: string;
}

export interface InvoiceViewToken {
  id: string;
  invoice_id: string;
  token: string;
  expires_at: string;
  is_used: boolean;
  viewed_at?: string;
  viewer_ip?: string;
  viewer_user_agent?: string;
  view_count: number;
  created_at: string;
}

export interface EmailLog {
  id: string;
  invoice_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  from_email: string;
  reply_to_email: string;
  status: EmailStatus;
  queue_id?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  sent_at?: string;
  delivered_at?: string;
  bounced_at?: string;
  failed_at?: string;
  error_message?: string;
  provider?: string;
  provider_message_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ReminderLog {
  id: string;
  invoice_id: string;
  email_log_id?: string;
  reminder_type: ReminderType;
  days_offset?: number;
  sent_at: string;
  status: string;
}

export interface PaymentWebhook {
  id: string;
  invoice_id?: string;
  provider: PaymentProvider;
  event_type: string;
  event_id: string;
  payload: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  processed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id?: string;
  resource_type: string;
  resource_id: string;
  action: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  company_id: string;
  template_type: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VatRate {
  id: string;
  company_id: string;
  rate: number;
  description: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

// API Request/Response types
export interface CreateInvoiceRequest {
  customer_id: string;
  issue_date: string;
  due_date?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  reminder_settings?: ReminderSettings;
}

export interface UpdateInvoiceRequest {
  customer_id?: string;
  issue_date?: string;
  due_date?: string;
  items?: {
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  reminder_settings?: ReminderSettings;
}

export interface InvoiceResponse {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer;
  company: Company;
}

export interface GeneratePDFRequest {
  mode: 'draft' | 'final';
}

export interface SendEmailRequest {
  recipient_email?: string;
  subject?: string;
  body?: string;
  include_pdf: boolean;
}

export interface CreateCreditNoteRequest {
  invoice_id: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
  notes?: string;
}

export interface PaymentWebhookPayload {
  provider: PaymentProvider;
  event_type: string;
  event_id: string;
  invoice_id?: string;
  amount?: number;
  status?: string;
  payment_reference?: string;
  metadata?: Record<string, any>;
}

// Permissions
export interface Permissions {
  canCreateInvoice: boolean;
  canEditInvoice: boolean;
  canDeleteInvoice: boolean;
  canSendInvoice: boolean;
  canViewInvoice: boolean;
  canManageCustomers: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  owner: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: true,
    canSendInvoice: true,
    canViewInvoice: true,
    canManageCustomers: true,
    canManageUsers: true,
    canViewReports: true,
    canManageSettings: true,
  },
  admin: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: true,
    canSendInvoice: true,
    canViewInvoice: true,
    canManageCustomers: true,
    canManageUsers: true,
    canViewReports: true,
    canManageSettings: false,
  },
  accountant: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: false,
    canSendInvoice: true,
    canViewInvoice: true,
    canManageCustomers: true,
    canManageUsers: false,
    canViewReports: true,
    canManageSettings: false,
  },
  viewer: {
    canCreateInvoice: false,
    canEditInvoice: false,
    canDeleteInvoice: false,
    canSendInvoice: false,
    canViewInvoice: true,
    canManageCustomers: false,
    canManageUsers: false,
    canViewReports: true,
    canManageSettings: false,
  },
};
