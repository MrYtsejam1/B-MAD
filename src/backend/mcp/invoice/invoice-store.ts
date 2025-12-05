import { Invoice, InvoiceStatus } from '../../models/invoice.model';

export class InvoiceStore {
  private static instance: InvoiceStore;
  private invoices: Map<string, Invoice> = new Map();

  private constructor() {}

  static getInstance(): InvoiceStore {
    if (!InvoiceStore.instance) {
      InvoiceStore.instance = new InvoiceStore();
    }
    return InvoiceStore.instance;
  }

  generateInvoiceId(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `INV-${dateStr}-${random}`;
  }

  save(invoice: Invoice): void {
    this.invoices.set(invoice.invoiceId, invoice);
  }

  get(invoiceId: string): Invoice | undefined {
    return this.invoices.get(invoiceId);
  }

  getByUser(userId: string): Invoice[] {
    return Array.from(this.invoices.values())
      .filter(inv => inv.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  updateStatus(invoiceId: string, status: InvoiceStatus, notes?: string): boolean {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      return false;
    }

    invoice.status = status;
    const now = new Date().toISOString();

    switch (status) {
      case InvoiceStatus.MANAGER_APPROVED:
        invoice.approvedAt = now;
        invoice.managerNotes = notes;
        break;
      case InvoiceStatus.FINANCE_APPROVED:
        invoice.financeNotes = notes;
        break;
      case InvoiceStatus.REIMBURSED:
        invoice.reimbursedAt = now;
        break;
      case InvoiceStatus.REJECTED:
        invoice.rejectedAt = now;
        invoice.rejectionReason = notes;
        break;
    }

    this.invoices.set(invoiceId, invoice);
    return true;
  }

  clear(): void {
    this.invoices.clear();
  }
}
