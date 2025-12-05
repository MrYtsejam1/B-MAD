import { InvoiceStore } from './invoice-store';
import {
  Invoice,
  InvoiceStatus,
  InvoiceSubmitRequest,
  InvoiceSubmitResponse,
  InvoiceStatusResponse,
} from '../../models/invoice.model';

const store = InvoiceStore.getInstance();

export async function submit(payload: InvoiceSubmitRequest): Promise<InvoiceSubmitResponse> {
  if (!payload.date || !payload.amount || !payload.currency || !payload.purpose || !payload.category) {
    throw new Error('Missing required fields: date, amount, currency, purpose, category');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(payload.date)) {
    throw new Error('Invalid date format. Expected ISO 8601 (YYYY-MM-DD)');
  }

  if (typeof payload.amount !== 'number' || payload.amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'];
  if (!validCurrencies.includes(payload.currency.toUpperCase())) {
    throw new Error(`Invalid currency. Supported: ${validCurrencies.join(', ')}`);
  }

  if (payload.purpose.length < 10 || payload.purpose.length > 500) {
    throw new Error('Purpose must be between 10 and 500 characters');
  }

  const validCategories = ['meals', 'travel', 'supplies', 'software', 'other'];
  if (!validCategories.includes(payload.category)) {
    throw new Error(`Invalid category. Supported: ${validCategories.join(', ')}`);
  }

  const invoiceId = store.generateInvoiceId();
  const now = new Date().toISOString();

  const invoice: Invoice = {
    invoiceId,
    userId: 'demo-user',
    date: payload.date,
    amount: payload.amount,
    currency: payload.currency.toUpperCase(),
    purpose: payload.purpose,
    category: payload.category,
    receiptUrl: payload.receiptUrl,
    status: InvoiceStatus.SUBMITTED,
    submittedAt: now,
  };

  store.save(invoice);

  if (invoice.amount < 100) {
    setTimeout(() => {
      store.updateStatus(invoiceId, InvoiceStatus.MANAGER_APPROVED, 'Auto-approved (amount < $100)');
    }, 2000);
  }

  return {
    invoiceId,
    status: InvoiceStatus.SUBMITTED,
    message: 'Invoice submitted successfully. Awaiting manager approval.',
    submittedAt: now,
  };
}

export async function status(payload: { invoiceId: string }): Promise<InvoiceStatusResponse> {
  if (!payload.invoiceId) {
    throw new Error('Missing required field: invoiceId');
  }

  const invoice = store.get(payload.invoiceId);
  if (!invoice) {
    throw new Error(`Invoice not found: ${payload.invoiceId}`);
  }

  return {
    invoiceId: invoice.invoiceId,
    status: invoice.status,
    date: invoice.date,
    amount: invoice.amount,
    currency: invoice.currency,
    purpose: invoice.purpose,
    category: invoice.category,
    submittedAt: invoice.submittedAt,
    approvedAt: invoice.approvedAt,
    reimbursedAt: invoice.reimbursedAt,
    rejectedAt: invoice.rejectedAt,
    rejectionReason: invoice.rejectionReason,
  };
}

export async function list(payload: { userId?: string }): Promise<Invoice[]> {
  const userId = payload.userId || 'demo-user';
  return store.getByUser(userId);
}
