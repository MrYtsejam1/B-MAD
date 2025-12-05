export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  MANAGER_APPROVED = 'MANAGER_APPROVED',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  REIMBURSED = 'REIMBURSED',
  REJECTED = 'REJECTED',
}

export enum InvoiceCategory {
  MEALS = 'meals',
  TRAVEL = 'travel',
  SUPPLIES = 'supplies',
  SOFTWARE = 'software',
  OTHER = 'other',
}

export interface Invoice {
  invoiceId: string;
  userId: string;
  date: string;
  amount: number;
  currency: string;
  purpose: string;
  category: InvoiceCategory;
  receiptUrl?: string;
  status: InvoiceStatus;
  submittedAt: string;
  approvedAt?: string;
  reimbursedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  managerNotes?: string;
  financeNotes?: string;
}

export interface InvoiceSubmitRequest {
  date: string;
  amount: number;
  currency: string;
  purpose: string;
  category: InvoiceCategory;
  receiptUrl?: string;
}

export interface InvoiceSubmitResponse {
  invoiceId: string;
  status: InvoiceStatus;
  message: string;
  submittedAt: string;
}

export interface InvoiceStatusResponse {
  invoiceId: string;
  status: InvoiceStatus;
  date: string;
  amount: number;
  currency: string;
  purpose: string;
  category: InvoiceCategory;
  submittedAt: string;
  approvedAt?: string;
  reimbursedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}
