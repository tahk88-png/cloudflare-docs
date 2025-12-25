import { Invoice, Customer, Tenant, User, EmailLog, AuditLog, ViewToken } from './types';

// In-memory storage for simulation
const store = {
  tenants: new Map<string, Tenant>(),
  users: new Map<string, User>(),
  customers: new Map<string, Customer>(),
  invoices: new Map<string, Invoice>(),
  emailLogs: new Map<string, EmailLog>(),
  auditLogs: new Map<string, AuditLog>(),
  viewTokens: new Map<string, ViewToken>(),
};

// Seed a default tenant
store.tenants.set('default-tenant', {
  id: 'default-tenant',
  name: 'Acme Corp',
  emailSettings: {
    fromName: 'Acme Billing',
    fromEmail: 'no-reply@acme.com',
    replyTo: 'support@acme.com',
  },
  invoiceSettings: {
    nextNumber: 1,
    prefix: '2025-',
    dateFormat: 'YYYY-MM-DD',
    currency: 'USD',
  },
});

export const db = {
  tenants: {
    get: async (id: string) => store.tenants.get(id),
    update: async (id: string, data: Partial<Tenant>) => {
      const tenant = store.tenants.get(id);
      if (!tenant) throw new Error('Tenant not found');
      const updated = { ...tenant, ...data };
      store.tenants.set(id, updated);
      return updated;
    },
  },
  invoices: {
    create: async (invoice: Invoice) => {
      store.invoices.set(invoice.id, invoice);
      return invoice;
    },
    get: async (id: string) => store.invoices.get(id),
    update: async (id: string, data: Partial<Invoice>) => {
      const invoice = store.invoices.get(id);
      if (!invoice) throw new Error('Invoice not found');
      const updated = { ...invoice, ...data };
      store.invoices.set(id, updated);
      return updated;
    },
    listByTenant: async (tenantId: string) => {
      return Array.from(store.invoices.values()).filter(i => i.tenantId === tenantId);
    },
    findLatestNumber: async (tenantId: string, yearPrefix: string): Promise<string | null> => {
      // Very inefficient for large datasets, but fine for mock
      const tenantInvoices = Array.from(store.invoices.values())
        .filter(i => i.tenantId === tenantId && i.number.startsWith(yearPrefix))
        .sort((a, b) => b.number.localeCompare(a.number));
      return tenantInvoices.length > 0 ? tenantInvoices[0].number : null;
    }
  },
  customers: {
    get: async (id: string) => store.customers.get(id),
    create: async (customer: Customer) => {
        store.customers.set(customer.id, customer);
        return customer;
    },
    listByTenant: async (tenantId: string) => {
        return Array.from(store.customers.values()).filter(c => c.tenantId === tenantId);
    }
  },
  emailLogs: {
    create: async (log: EmailLog) => {
      store.emailLogs.set(log.id, log);
      return log;
    },
    listByInvoice: async (invoiceId: string) => {
      return Array.from(store.emailLogs.values()).filter(l => l.invoiceId === invoiceId);
    },
  },
  auditLogs: {
    create: async (log: AuditLog) => {
      store.auditLogs.set(log.id, log);
      return log;
    },
  },
  viewTokens: {
      create: async (token: ViewToken) => {
          store.viewTokens.set(token.token, token);
          return token;
      },
      get: async (token: string) => store.viewTokens.get(token),
  }
};
