# STORY-MCP-002: Invoice Mock API

**Sprint**: 1  
**Points**: 5  
**Priority**: P0 (Must Have)  
**Owner**: Developer Agent  
**Status**: Not Started  
**Dependencies**: STORY-MCP-001 (MCP Gateway Core)

---

## Context

### PRD Reference (Embedded)

From `/docs/phase2-planning/prd.md`:

> **FR-3: Form Submission**
> 
> **FR-3.1**: System SHALL accept form submissions via API  
> **FR-3.2**: System SHALL validate submitted data against schema  
> **FR-3.3**: System SHALL return submission confirmation  
> **FR-3.4**: System SHALL store submission data  
> **FR-3.5**: System SHALL support file attachments (receipts)

> **FR-8: Business Workflow Integration**
> 
> **FR-8.1**: System SHALL integrate with MCP servers for domain-specific workflows  
> **FR-8.2**: System SHALL support invoice submission workflow  
> **FR-8.3**: System SHALL track workflow state (DRAFT → SUBMITTED → APPROVED → REIMBURSED)  
> **FR-8.4**: System SHALL validate required fields per workflow

### Architecture Reference (Embedded)

From `/docs/ARCHITECTURE_PLAN.md`:

> **Invoice MCP Server**
> 
> **Purpose**: Mock API for expense invoice submission and tracking
> 
> **Endpoints**:
> - `POST /mock/invoices/submit` - Submit new invoice
> - `GET /mock/invoices/status/:id` - Get invoice status
> - `GET /mock/invoices/list` - List user's invoices
> 
> **Workflow States**:
> 1. DRAFT - Invoice created but not submitted
> 2. SUBMITTED - Awaiting manager approval
> 3. MANAGER_APPROVED - Manager approved, awaiting finance
> 4. FINANCE_APPROVED - Finance approved, awaiting reimbursement
> 5. REIMBURSED - Payment processed
> 6. REJECTED - Rejected by manager or finance
> 
> **Required Fields**:
> - date (ISO 8601 date)
> - amount (positive number)
> - currency (ISO 4217 code: USD, EUR, GBP, etc.)
> - purpose (string, 10-500 chars)
> - category (enum: meals, travel, supplies, software, other)
> - receiptUrl (optional, URL to uploaded receipt)

---

## Requirements

### Functional Requirements

- [ ] Implement POST /mock/invoices/submit endpoint
- [ ] Implement GET /mock/invoices/status/:id endpoint
- [ ] Implement GET /mock/invoices/list endpoint
- [ ] Validate all required fields (date, amount, currency, purpose, category)
- [ ] Generate unique invoice IDs (format: INV-YYYYMMDD-XXXXX)
- [ ] Store invoice data in memory (Map-based storage)
- [ ] Return appropriate HTTP status codes (200, 201, 400, 404)
- [ ] Support workflow state transitions
- [ ] Handle invalid payloads with detailed error messages

### Non-Functional Requirements

- [ ] Response time < 100ms P95
- [ ] Support concurrent requests (thread-safe)
- [ ] Comprehensive error logging
- [ ] Input validation with clear error messages
- [ ] JSON Schema validation for request/response

---

## Implementation

### Files to Create

1. **`src/backend/mcp/invoice/mock-api.ts`** (Mock API handlers)
2. **`src/backend/mcp/invoice/invoice-store.ts`** (In-memory storage)
3. **`src/backend/models/invoice.model.ts`** (TypeScript interfaces)
4. **`config/schemas/invoice-submit.request.json`** (Request schema)
5. **`config/schemas/invoice-submit.response.json`** (Response schema)
6. **`config/schemas/invoice-status.response.json`** (Status response schema)
7. **`src/backend/mcp/invoice/mock-api.spec.ts`** (Unit tests)

### Code Structure

**`src/backend/models/invoice.model.ts`**:
```typescript
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
  date: string; // ISO 8601 date
  amount: number;
  currency: string; // ISO 4217 code
  purpose: string;
  category: InvoiceCategory;
  receiptUrl?: string;
  status: InvoiceStatus;
  submittedAt: string; // ISO 8601 timestamp
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
```

**`src/backend/mcp/invoice/invoice-store.ts`**:
```typescript
import { Invoice, InvoiceStatus } from '../../models/invoice.model';

/**
 * In-memory storage for invoices (Sprint 1 only)
 * TODO: Replace with database in Sprint 2
 */
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

  /**
   * Generate unique invoice ID
   */
  generateInvoiceId(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `INV-${dateStr}-${random}`;
  }

  /**
   * Save invoice
   */
  save(invoice: Invoice): void {
    this.invoices.set(invoice.invoiceId, invoice);
  }

  /**
   * Get invoice by ID
   */
  get(invoiceId: string): Invoice | undefined {
    return this.invoices.get(invoiceId);
  }

  /**
   * Get all invoices for a user
   */
  getByUser(userId: string): Invoice[] {
    return Array.from(this.invoices.values())
      .filter(inv => inv.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  /**
   * Update invoice status
   */
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

  /**
   * Clear all invoices (for testing)
   */
  clear(): void {
    this.invoices.clear();
  }
}
```

**`src/backend/mcp/invoice/mock-api.ts`**:
```typescript
import { InvoiceStore } from './invoice-store';
import {
  Invoice,
  InvoiceStatus,
  InvoiceSubmitRequest,
  InvoiceSubmitResponse,
  InvoiceStatusResponse,
} from '../../models/invoice.model';

const store = InvoiceStore.getInstance();

/**
 * Submit a new invoice
 * Called by MCP Gateway when agent invokes mcp.invoice.submit
 */
export async function submit(payload: InvoiceSubmitRequest): Promise<InvoiceSubmitResponse> {
  // Validate required fields
  if (!payload.date || !payload.amount || !payload.currency || !payload.purpose || !payload.category) {
    throw new Error('Missing required fields: date, amount, currency, purpose, category');
  }

  // Validate date format (ISO 8601)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(payload.date)) {
    throw new Error('Invalid date format. Expected ISO 8601 (YYYY-MM-DD)');
  }

  // Validate amount (positive number)
  if (typeof payload.amount !== 'number' || payload.amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  // Validate currency (ISO 4217 code)
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'];
  if (!validCurrencies.includes(payload.currency.toUpperCase())) {
    throw new Error(`Invalid currency. Supported: ${validCurrencies.join(', ')}`);
  }

  // Validate purpose length
  if (payload.purpose.length < 10 || payload.purpose.length > 500) {
    throw new Error('Purpose must be between 10 and 500 characters');
  }

  // Validate category
  const validCategories = ['meals', 'travel', 'supplies', 'software', 'other'];
  if (!validCategories.includes(payload.category)) {
    throw new Error(`Invalid category. Supported: ${validCategories.join(', ')}`);
  }

  // Create invoice
  const invoiceId = store.generateInvoiceId();
  const now = new Date().toISOString();

  const invoice: Invoice = {
    invoiceId,
    userId: 'demo-user', // TODO: Get from auth context
    date: payload.date,
    amount: payload.amount,
    currency: payload.currency.toUpperCase(),
    purpose: payload.purpose,
    category: payload.category,
    receiptUrl: payload.receiptUrl,
    status: InvoiceStatus.SUBMITTED,
    submittedAt: now,
  };

  // Save invoice
  store.save(invoice);

  // Simulate automatic approval for demo (amounts < $100)
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

/**
 * Get invoice status
 * Called by MCP Gateway when agent invokes mcp.invoice.status
 */
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

/**
 * List user's invoices
 * Called by MCP Gateway when agent invokes mcp.invoice.list
 */
export async function list(payload: { userId?: string }): Promise<Invoice[]> {
  const userId = payload.userId || 'demo-user';
  return store.getByUser(userId);
}
```

**`config/schemas/invoice-submit.request.json`**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["date", "amount", "currency", "purpose", "category"],
  "properties": {
    "date": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "Invoice date in ISO 8601 format (YYYY-MM-DD)"
    },
    "amount": {
      "type": "number",
      "minimum": 0.01,
      "description": "Invoice amount (positive number)"
    },
    "currency": {
      "type": "string",
      "enum": ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CNY"],
      "description": "Currency code (ISO 4217)"
    },
    "purpose": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500,
      "description": "Purpose of the expense"
    },
    "category": {
      "type": "string",
      "enum": ["meals", "travel", "supplies", "software", "other"],
      "description": "Expense category"
    },
    "receiptUrl": {
      "type": "string",
      "format": "uri",
      "description": "Optional URL to uploaded receipt image"
    }
  },
  "additionalProperties": false
}
```

**`config/schemas/invoice-submit.response.json`**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["invoiceId", "status", "message", "submittedAt"],
  "properties": {
    "invoiceId": {
      "type": "string",
      "pattern": "^INV-\\d{8}-\\d{5}$",
      "description": "Unique invoice ID"
    },
    "status": {
      "type": "string",
      "enum": ["DRAFT", "SUBMITTED", "MANAGER_APPROVED", "FINANCE_APPROVED", "REIMBURSED", "REJECTED"],
      "description": "Current invoice status"
    },
    "message": {
      "type": "string",
      "description": "Human-readable status message"
    },
    "submittedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Submission timestamp (ISO 8601)"
    }
  }
}
```

**`config/schemas/invoice-status.response.json`**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["invoiceId", "status", "date", "amount", "currency", "purpose", "category", "submittedAt"],
  "properties": {
    "invoiceId": {
      "type": "string",
      "pattern": "^INV-\\d{8}-\\d{5}$"
    },
    "status": {
      "type": "string",
      "enum": ["DRAFT", "SUBMITTED", "MANAGER_APPROVED", "FINANCE_APPROVED", "REIMBURSED", "REJECTED"]
    },
    "date": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
    },
    "amount": {
      "type": "number",
      "minimum": 0.01
    },
    "currency": {
      "type": "string"
    },
    "purpose": {
      "type": "string"
    },
    "category": {
      "type": "string"
    },
    "submittedAt": {
      "type": "string",
      "format": "date-time"
    },
    "approvedAt": {
      "type": "string",
      "format": "date-time"
    },
    "reimbursedAt": {
      "type": "string",
      "format": "date-time"
    },
    "rejectedAt": {
      "type": "string",
      "format": "date-time"
    },
    "rejectionReason": {
      "type": "string"
    }
  }
}
```

### Existing Code Patterns

From `src/backend/services/emulated-ai.service.ts`:
```typescript
// Map-based storage pattern
private mockResponses: Map<string, any> = new Map();

// Singleton pattern
private static instance: EmulatedAIService;
static getInstance(): EmulatedAIService {
  if (!EmulatedAIService.instance) {
    EmulatedAIService.instance = new EmulatedAIService();
  }
  return EmulatedAIService.instance;
}
```

From `src/backend/models/form-schema.model.ts`:
```typescript
// Enum pattern
export enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  NUMBER = 'number',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  DATE = 'date',
}
```

---

## Testing

### Unit Tests (`src/backend/mcp/invoice/mock-api.spec.ts`)

```typescript
import { submit, status, list } from './mock-api';
import { InvoiceStore } from './invoice-store';
import { InvoiceStatus } from '../../models/invoice.model';

describe('Invoice Mock API', () => {
  let store: InvoiceStore;

  beforeEach(() => {
    store = InvoiceStore.getInstance();
    store.clear();
  });

  describe('submit', () => {
    it('should submit valid invoice', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'USD',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'meals' as any,
      };

      const result = await submit(payload);

      expect(result.invoiceId).toMatch(/^INV-\d{8}-\d{5}$/);
      expect(result.status).toBe(InvoiceStatus.SUBMITTED);
      expect(result.message).toContain('submitted successfully');
      expect(result.submittedAt).toBeTruthy();
    });

    it('should reject invoice with missing required fields', async () => {
      const payload = {
        amount: 45.50,
        currency: 'USD',
      } as any;

      await expect(submit(payload)).rejects.toThrow('Missing required fields');
    });

    it('should reject invoice with invalid date format', async () => {
      const payload = {
        date: '12/04/2025', // Wrong format
        amount: 45.50,
        currency: 'USD',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'meals' as any,
      };

      await expect(submit(payload)).rejects.toThrow('Invalid date format');
    });

    it('should reject invoice with negative amount', async () => {
      const payload = {
        date: '2025-12-04',
        amount: -45.50,
        currency: 'USD',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'meals' as any,
      };

      await expect(submit(payload)).rejects.toThrow('Amount must be a positive number');
    });

    it('should reject invoice with invalid currency', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'XXX',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'meals' as any,
      };

      await expect(submit(payload)).rejects.toThrow('Invalid currency');
    });

    it('should reject invoice with short purpose', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'USD',
        purpose: 'Lunch', // Too short
        category: 'meals' as any,
      };

      await expect(submit(payload)).rejects.toThrow('Purpose must be between 10 and 500 characters');
    });

    it('should reject invoice with invalid category', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'USD',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'invalid' as any,
      };

      await expect(submit(payload)).rejects.toThrow('Invalid category');
    });

    it('should auto-approve invoices under $100', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 50.00,
        currency: 'USD',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'meals' as any,
      };

      const result = await submit(payload);
      
      // Wait for auto-approval
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const statusResult = await status({ invoiceId: result.invoiceId });
      expect(statusResult.status).toBe(InvoiceStatus.MANAGER_APPROVED);
    });

    it('should include optional receiptUrl', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'USD',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'meals' as any,
        receiptUrl: 'https://example.com/receipts/12345.jpg',
      };

      const result = await submit(payload);
      const invoice = store.get(result.invoiceId);
      
      expect(invoice?.receiptUrl).toBe('https://example.com/receipts/12345.jpg');
    });
  });

  describe('status', () => {
    it('should return invoice status', async () => {
      // Submit invoice first
      const submitPayload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'USD',
        purpose: 'Client lunch meeting at downtown restaurant',
        category: 'meals' as any,
      };
      const submitResult = await submit(submitPayload);

      // Get status
      const result = await status({ invoiceId: submitResult.invoiceId });

      expect(result.invoiceId).toBe(submitResult.invoiceId);
      expect(result.status).toBe(InvoiceStatus.SUBMITTED);
      expect(result.amount).toBe(45.50);
      expect(result.currency).toBe('USD');
    });

    it('should throw error for non-existent invoice', async () => {
      await expect(
        status({ invoiceId: 'INV-20251204-99999' })
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw error for missing invoiceId', async () => {
      await expect(
        status({} as any)
      ).rejects.toThrow('Missing required field: invoiceId');
    });
  });

  describe('list', () => {
    it('should return empty list for user with no invoices', async () => {
      const result = await list({ userId: 'test-user' });
      expect(result).toEqual([]);
    });

    it('should return user invoices sorted by date', async () => {
      // Submit 3 invoices
      await submit({
        date: '2025-12-01',
        amount: 30.00,
        currency: 'USD',
        purpose: 'First invoice for testing purposes',
        category: 'meals' as any,
      });

      await submit({
        date: '2025-12-03',
        amount: 50.00,
        currency: 'USD',
        purpose: 'Third invoice for testing purposes',
        category: 'travel' as any,
      });

      await submit({
        date: '2025-12-02',
        amount: 40.00,
        currency: 'USD',
        purpose: 'Second invoice for testing purposes',
        category: 'supplies' as any,
      });

      const result = await list({ userId: 'demo-user' });

      expect(result).toHaveLength(3);
      // Should be sorted by submittedAt (most recent first)
      expect(new Date(result[0].submittedAt).getTime())
        .toBeGreaterThan(new Date(result[1].submittedAt).getTime());
    });
  });
});
```

### Integration Tests

```typescript
describe('Invoice Mock API Integration', () => {
  it('should complete full invoice submission and status check flow', async () => {
    // 1. Submit invoice
    const submitPayload = {
      date: '2025-12-04',
      amount: 125.75,
      currency: 'USD',
      purpose: 'Team dinner with clients at steakhouse',
      category: 'meals' as any,
      receiptUrl: 'https://example.com/receipts/12345.jpg',
    };

    const submitResult = await submit(submitPayload);
    expect(submitResult.invoiceId).toBeTruthy();
    expect(submitResult.status).toBe(InvoiceStatus.SUBMITTED);

    // 2. Check status
    const statusResult = await status({ invoiceId: submitResult.invoiceId });
    expect(statusResult.invoiceId).toBe(submitResult.invoiceId);
    expect(statusResult.amount).toBe(125.75);
    expect(statusResult.receiptUrl).toBe('https://example.com/receipts/12345.jpg');

    // 3. List invoices
    const listResult = await list({ userId: 'demo-user' });
    expect(listResult.length).toBeGreaterThan(0);
    expect(listResult.some(inv => inv.invoiceId === submitResult.invoiceId)).toBe(true);
  });
});
```

---

## Acceptance Criteria

- [ ] POST /mock/invoices/submit accepts valid invoice and returns invoiceId
- [ ] Validates all required fields (date, amount, currency, purpose, category)
- [ ] Rejects invalid date format (non-ISO 8601)
- [ ] Rejects negative or zero amounts
- [ ] Rejects invalid currency codes
- [ ] Rejects purpose < 10 or > 500 characters
- [ ] Rejects invalid categories
- [ ] Generates unique invoice IDs (INV-YYYYMMDD-XXXXX format)
- [ ] Auto-approves invoices < $100 after 2 seconds
- [ ] GET /mock/invoices/status/:id returns invoice details
- [ ] Returns 404 for non-existent invoice IDs
- [ ] GET /mock/invoices/list returns user's invoices sorted by date
- [ ] All unit tests pass (> 90% coverage)
- [ ] Integration tests pass
- [ ] Response time < 100ms P95

---

## Definition of Done

- [ ] Code complete and follows TypeScript best practices
- [ ] All unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code coverage > 90%
- [ ] JSON schemas created and validated
- [ ] Code reviewed by Architect
- [ ] Documentation updated (inline comments)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Integrated with MCP Gateway (STORY-MCP-001)
- [ ] Manual testing complete

---

## Notes

- This mock API simulates a real invoice submission system
- In-memory storage is sufficient for Sprint 1 (will be replaced with database in Sprint 2)
- Auto-approval for amounts < $100 is for demo purposes only
- Real system would integrate with approval workflows and payment systems
- JSON schemas ensure consistent request/response formats
- Invoice IDs use date-based format for easy identification

---

**Related Stories**:
- STORY-MCP-001: MCP Gateway Core (dependency)
- STORY-OCR-001: OCR Service (will provide receiptUrl)
- STORY-AGENT-002: Agent Tools (will call this API via gateway)
