// Enhanced TypeScript types for B2B invoicing with document signing

export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer';
export type InvoiceType = 'invoice' | 'credit_note';
export type InvoiceStatus = 'draft' | 'awaiting_signature' | 'signed' | 'sent' | 'payment_pending' | 'paid' | 'overdue' | 'cancelled' | 'void';
export type EmailStatus = 'queued' | 'sending' | 'sent' | 'bounced' | 'failed';
export type PaymentProvider = 'stripe' | 'montonio' | 'bank_transfer';
export type DocumentType = 'acceptance_act' | 'contract' | 'invoice';
export type DocumentStatus = 'draft' | 'awaiting_signature' | 'signed' | 'declined' | 'failed' | 'cancelled';
export type SignerRole = 'seller' | 'buyer' | 'witness';
export type SigningMethod = 'smartid' | 'mobileid' | 'idcard' | 'email_otp' | 'manual';
export type SignerStatus = 'pending' | 'invited' | 'opened' | 'signed' | 'declined' | 'failed' | 'expired';
export type SigningProvider = 'sk_id_solutions' | 'dokobit' | 'docusign' | 'custom' | 'dummy';

// ===========================================
// TENANTS & USERS
// ===========================================

export interface Tenant {
  id: string;
  name: string;
  email: string;
  reg_code?: string;
  vat_number?: string;
  iban?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  logo_url?: string;
  invoice_prefix?: string;
  default_currency: string;
  settings?: TenantSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  email_from?: string;
  email_reply_to?: string;
  reminder_schedule?: {
    reminder_1?: number; // days after due_date
    reminder_2?: number;
    reminder_3?: number;
  };
  require_signature_before_send?: boolean; // Block sending until signed
  signing_provider?: SigningProvider;
  signing_provider_config?: Record<string, string>;
  payment_providers?: PaymentProvider[];
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ===========================================
// INVOICES (ENHANCED)
// ===========================================

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  parent_invoice_id?: string;
  status: InvoiceStatus;
  
  // Dates
  issue_date: string;
  due_date: string;
  paid_at?: string;
  
  // Seller details (snapshot)
  seller_name: string;
  seller_reg_code?: string;
  seller_vat_number?: string;
  seller_iban?: string;
  seller_address?: string;
  seller_email?: string;
  seller_phone?: string;
  
  // Buyer details
  buyer_name: string;
  buyer_reg_code?: string;
  buyer_vat_number?: string;
  buyer_email: string;
  buyer_address?: string;
  buyer_phone?: string;
  
  // Financial
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  paid_amount: number;
  
  // PDFs
  pdf_draft_url?: string;
  pdf_final_url?: string;
  pdf_final_sha256?: string;
  pdf_generated_at?: string;
  
  // Email
  sent_at?: string;
  sent_to_email?: string;
  email_message_id?: string;
  
  // Payment
  payment_provider?: PaymentProvider;
  payment_link_url?: string;
  payment_reference?: string;
  
  // Notes
  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  
  // Reminders
  reminder_settings?: Record<string, any>;
  last_reminder_sent_at?: string;
  reminder_count: number;
  
  // Tracking
  view_count: number;
  
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface InvoiceItem {
  id: string;
  tenant_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percent: number;
  line_total: number; // Server-calculated
  sort_order: number;
  created_at: string;
}

export interface VatRate {
  id: string;
  tenant_id: string;
  rate: number;
  description: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

// ===========================================
// DOCUMENT SIGNING
// ===========================================

export interface Document {
  id: string;
  tenant_id: string;
  type: DocumentType;
  status: DocumentStatus;
  related_invoice_id?: string;
  title: string;
  description?: string;
  pdf_url?: string;
  pdf_sha256?: string;
  signed_pdf_url?: string;
  signed_pdf_sha256?: string;
  signed_at?: string;
  all_signed_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DocumentSigner {
  id: string;
  tenant_id: string;
  document_id: string;
  role: SignerRole;
  name: string;
  email: string;
  phone?: string;
  personal_code?: string;
  signing_method: SigningMethod;
  status: SignerStatus;
  signed_at?: string;
  signature_value?: string;
  certificate?: string;
  invitation_sent_at?: string;
  invitation_token?: string;
  invitation_expires_at?: string;
  signing_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignatureRequest {
  id: string;
  tenant_id: string;
  document_id: string;
  provider: SigningProvider;
  provider_request_id?: string;
  provider_session_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  last_error?: string;
  retry_count: number;
  webhook_received_at?: string;
  webhook_payload?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// ===========================================
// EMAIL TEMPLATES
// ===========================================

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables?: string[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  tenant_id: string;
  invoice_id?: string;
  document_id?: string;
  to_email: string;
  from_email: string;
  reply_to_email: string;
  subject: string;
  body_html: string;
  body_text?: string;
  template_key?: string;
  status: EmailStatus;
  provider?: string;
  provider_message_id?: string;
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  sent_at?: string;
  delivered_at?: string;
  bounced_at?: string;
  failed_at?: string;
  error_message?: string;
  attachments?: Array<{ filename: string; url: string }>;
  created_at: string;
  updated_at: string;
}

// ===========================================
// AUDIT LOGGING
// ===========================================

export interface AuditLog {
  id: string;
  tenant_id: string;
  actor_user_id?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json?: Record<string, any>;
  after_json?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

export interface CreateInvoiceRequest {
  buyer_name: string;
  buyer_reg_code?: string;
  buyer_vat_number?: string;
  buyer_email: string;
  buyer_address?: string;
  buyer_phone?: string;
  issue_date: string;
  due_date?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    vat_percent: number;
  }[];
  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  require_signature?: boolean; // Override tenant setting
}

export interface CreateDocumentRequest {
  type: DocumentType;
  related_invoice_id?: string;
  title: string;
  description?: string;
  signers: {
    role: SignerRole;
    name: string;
    email: string;
    phone?: string;
    personal_code?: string;
    signing_method: SigningMethod;
    signing_order?: number;
    is_required?: boolean;
  }[];
}

export interface StartSigningRequest {
  provider?: SigningProvider; // Override tenant default
  send_invitations?: boolean;
  callback_url?: string;
}

export interface SignDocumentRequest {
  token: string;
  method: SigningMethod;
  // Method-specific fields
  phone?: string; // For SmartID/MobileID
  personal_code?: string;
  otp?: string; // For email OTP
}

export interface SendInvoiceRequest {
  to_email?: string; // Override buyer email
  template_key?: string;
  subject?: string;
  body_html?: string;
  include_acceptance_act?: boolean;
  force_resend?: boolean; // Override duplicate check
}

// ===========================================
// PERMISSIONS
// ===========================================

export interface Permissions {
  canCreateInvoice: boolean;
  canEditInvoice: boolean;
  canDeleteInvoice: boolean;
  canSendInvoice: boolean;
  canViewInvoice: boolean;
  canMarkPaid: boolean;
  canCreateDocument: boolean;
  canSignDocument: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canManageSettings: boolean;
  canExportData: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  owner: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: true,
    canSendInvoice: true,
    canViewInvoice: true,
    canMarkPaid: true,
    canCreateDocument: true,
    canSignDocument: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canManageSettings: true,
    canExportData: true,
  },
  admin: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: true,
    canSendInvoice: true,
    canViewInvoice: true,
    canMarkPaid: true,
    canCreateDocument: true,
    canSignDocument: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canManageSettings: false,
    canExportData: true,
  },
  accountant: {
    canCreateInvoice: true,
    canEditInvoice: true,
    canDeleteInvoice: false,
    canSendInvoice: true,
    canViewInvoice: true,
    canMarkPaid: true,
    canCreateDocument: true,
    canSignDocument: false,
    canManageUsers: false,
    canViewAuditLogs: true,
    canManageSettings: false,
    canExportData: true,
  },
  viewer: {
    canCreateInvoice: false,
    canEditInvoice: false,
    canDeleteInvoice: false,
    canSendInvoice: false,
    canViewInvoice: true,
    canMarkPaid: false,
    canCreateDocument: false,
    canSignDocument: false,
    canManageUsers: false,
    canViewAuditLogs: true,
    canManageSettings: false,
    canExportData: true,
  },
};

// ===========================================
// SIGNING PROVIDER INTERFACE
// ===========================================

export interface SigningProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  environment?: 'production' | 'sandbox';
  webhookSecret?: string;
}

export interface SigningProviderInterface {
  /**
   * Initialize signing session
   */
  initializeSigningSession(params: {
    document: Document;
    signers: DocumentSigner[];
    callbackUrl?: string;
  }): Promise<{
    sessionId: string;
    signingUrls: Record<string, string>; // signer_id -> signing_url
  }>;
  
  /**
   * Get signing status
   */
  getSigningStatus(sessionId: string): Promise<{
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    signers: Array<{
      signerId: string;
      status: SignerStatus;
      signedAt?: string;
    }>;
  }>;
  
  /**
   * Download signed document
   */
  downloadSignedDocument(sessionId: string): Promise<ArrayBuffer>;
  
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;
  
  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: any): {
    eventType: string;
    sessionId: string;
    signerId?: string;
    status: SignerStatus;
    signedAt?: string;
  };
}
