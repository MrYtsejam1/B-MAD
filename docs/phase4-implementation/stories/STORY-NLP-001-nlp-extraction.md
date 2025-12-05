# STORY-NLP-001: NLP Extraction Service

**Sprint**: 1  
**Points**: 5  
**Priority**: P1 (Important)  
**Owner**: Developer Agent  
**Status**: Not Started  
**Dependencies**: None

---

## Context

### PRD Reference (Embedded)

From `/docs/phase2-planning/prd.md`:

> **FR-5: Manual Invoice Entry**
> 
> **FR-5.1**: System SHALL support manual invoice entry without receipt  
> **FR-5.2**: System SHALL parse natural language invoice descriptions  
> **FR-5.3**: System SHALL extract invoice fields from text (date, amount, purpose, etc.)  
> **FR-5.4**: System SHALL handle ambiguous inputs gracefully  
> **FR-5.5**: System SHALL ask clarifying questions for ambiguous data  
> **FR-5.6**: System SHALL support common date/amount formats

> **Example Inputs**:
> - "I spent $45.50 on lunch with a client on December 4th"
> - "Taxi ride to airport yesterday, $32"
> - "Software subscription renewal, $99/month, charged today"

### Architecture Reference (Embedded)

From `/docs/ARCHITECTURE_PLAN.md`:

> **NLP Extraction Service**
> 
> **Purpose**: Extract invoice data from natural language text
> 
> **Approach**: Deterministic rules + regex patterns (Sprint 1)
> - Date extraction (relative dates: "yesterday", "last week", etc.)
> - Amount extraction (various formats: "$45", "45 dollars", "45.50 USD")
> - Purpose extraction (remaining text after date/amount removed)
> - Category inference (keyword matching)
> 
> **Future Enhancement**: LLM-based parsing for complex cases
> 
> **Confidence Scoring**:
> - High confidence (>0.8): All fields extracted clearly
> - Medium confidence (0.5-0.8): Some fields extracted, some inferred
> - Low confidence (<0.5): Ambiguous input, needs clarification

---

## Requirements

### Functional Requirements

- [ ] Parse natural language invoice descriptions
- [ ] Extract date from text (absolute and relative dates)
- [ ] Extract amount from text (various formats)
- [ ] Extract currency from text (USD, EUR, GBP, etc.)
- [ ] Extract purpose from text (remaining text)
- [ ] Infer category from keywords
- [ ] Return confidence scores for each field
- [ ] Flag ambiguous inputs for clarification
- [ ] Handle common date formats (MM/DD/YYYY, "yesterday", "last week", etc.)
- [ ] Handle common amount formats ($45, 45 dollars, 45.50 USD, etc.)

### Non-Functional Requirements

- [ ] Processing time < 100ms P95
- [ ] Support for multiple languages (English, Spanish, French)
- [ ] Comprehensive error logging
- [ ] Thread-safe for concurrent requests

---

## Implementation

### Files to Create

1. **`src/backend/services/nlp.service.ts`** (Main NLP service)
2. **`src/backend/services/nlp-extractors.ts`** (Field extractors)
3. **`src/backend/models/nlp.model.ts`** (TypeScript interfaces)
4. **`src/backend/services/nlp.service.spec.ts`** (Unit tests)

### Code Structure

**`src/backend/models/nlp.model.ts`**:
```typescript
export interface NLPRequest {
  text: string;
  context?: {
    currentDate?: string;
    defaultCurrency?: string;
  };
}

export interface NLPResult {
  success: boolean;
  invoice?: InvoiceExtraction;
  confidence: number;
  ambiguities?: string[];
  suggestions?: string[];
}

export interface InvoiceExtraction {
  date?: ExtractedField;
  amount?: ExtractedField;
  currency?: ExtractedField;
  purpose?: ExtractedField;
  category?: ExtractedField;
}

export interface ExtractedField {
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred' | 'default';
  needsReview: boolean;
}
```

**`src/backend/services/nlp.service.ts`**:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { NLPRequest, NLPResult, InvoiceExtraction } from '../models/nlp.model';
import { NLPExtractors } from './nlp-extractors';

@Injectable()
export class NLPService {
  private readonly logger = new Logger(NLPService.name);
  private readonly extractors: NLPExtractors;
  private readonly confidenceThreshold = 0.7;

  constructor() {
    this.extractors = new NLPExtractors();
  }

  /**
   * Extract invoice data from natural language text
   */
  async extractInvoice(request: NLPRequest): Promise<NLPResult> {
    try {
      const text = request.text.trim();

      if (!text || text.length < 5) {
        return {
          success: false,
          confidence: 0,
          ambiguities: ['Input text is too short. Please provide more details.'],
        };
      }

      // Extract fields
      const invoice: InvoiceExtraction = {};
      const ambiguities: string[] = [];

      // Extract date
      invoice.date = this.extractors.extractDate(text, request.context?.currentDate);
      if (!invoice.date || invoice.date.needsReview) {
        ambiguities.push('Date is unclear. Please specify the date (e.g., "December 4th" or "yesterday").');
      }

      // Extract amount
      invoice.amount = this.extractors.extractAmount(text);
      if (!invoice.amount || invoice.amount.needsReview) {
        ambiguities.push('Amount is unclear. Please specify the amount (e.g., "$45.50" or "45 dollars").');
      }

      // Extract currency
      invoice.currency = this.extractors.extractCurrency(text, request.context?.defaultCurrency);

      // Extract purpose
      invoice.purpose = this.extractors.extractPurpose(text, invoice.date, invoice.amount);
      if (!invoice.purpose || invoice.purpose.value.length < 10) {
        ambiguities.push('Purpose is unclear. Please provide more details about the expense.');
      }

      // Infer category
      invoice.category = this.extractors.inferCategory(text, invoice.purpose?.value);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(invoice);

      this.logger.log(`NLP extraction completed (confidence: ${confidence.toFixed(2)})`);

      return {
        success: true,
        invoice,
        confidence,
        ambiguities: ambiguities.length > 0 ? ambiguities : undefined,
        suggestions: this.generateSuggestions(invoice, ambiguities),
      };
    } catch (error) {
      this.logger.error(`NLP extraction failed: ${error.message}`, error.stack);

      return {
        success: false,
        confidence: 0,
        ambiguities: ['Failed to parse input. Please try rephrasing.'],
      };
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(invoice: InvoiceExtraction): number {
    const fields = [
      invoice.date,
      invoice.amount,
      invoice.currency,
      invoice.purpose,
      invoice.category,
    ];

    const validFields = fields.filter(f => f !== undefined);
    if (validFields.length === 0) return 0;

    const totalConfidence = validFields.reduce((sum, field) => sum + (field?.confidence || 0), 0);
    return totalConfidence / validFields.length;
  }

  /**
   * Generate suggestions for improving input
   */
  private generateSuggestions(invoice: InvoiceExtraction, ambiguities: string[]): string[] | undefined {
    if (ambiguities.length === 0) return undefined;

    const suggestions: string[] = [];

    if (!invoice.date || invoice.date.needsReview) {
      suggestions.push('Try: "I spent $45 on lunch on December 4th"');
    }

    if (!invoice.amount || invoice.amount.needsReview) {
      suggestions.push('Try: "Taxi ride yesterday for $32"');
    }

    if (!invoice.purpose || invoice.purpose.value.length < 10) {
      suggestions.push('Try: "Software subscription renewal for project management tool"');
    }

    return suggestions.length > 0 ? suggestions : undefined;
  }
}
```

**`src/backend/services/nlp-extractors.ts`**:
```typescript
import { ExtractedField } from '../models/nlp.model';

export class NLPExtractors {
  /**
   * Extract date from text
   */
  extractDate(text: string, currentDate?: string): ExtractedField | undefined {
    const lowerText = text.toLowerCase();
    const today = currentDate ? new Date(currentDate) : new Date();

    // Relative dates
    if (lowerText.includes('today')) {
      return {
        value: today.toISOString().split('T')[0],
        confidence: 0.9,
        source: 'explicit',
        needsReview: false,
      };
    }

    if (lowerText.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        value: yesterday.toISOString().split('T')[0],
        confidence: 0.9,
        source: 'explicit',
        needsReview: false,
      };
    }

    if (lowerText.includes('last week')) {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return {
        value: lastWeek.toISOString().split('T')[0],
        confidence: 0.7,
        source: 'inferred',
        needsReview: true,
      };
    }

    // Absolute dates
    const datePatterns = [
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi,
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
    ];

    for (const pattern of datePatterns) {
      const match = pattern.exec(text);
      if (match) {
        try {
          const dateStr = match[0];
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return {
              value: date.toISOString().split('T')[0],
              confidence: 0.85,
              source: 'explicit',
              needsReview: false,
            };
          }
        } catch (error) {
          // Continue to next pattern
        }
      }
    }

    // Default to today if no date found
    return {
      value: today.toISOString().split('T')[0],
      confidence: 0.5,
      source: 'default',
      needsReview: true,
    };
  }

  /**
   * Extract amount from text
   */
  extractAmount(text: string): ExtractedField | undefined {
    const amountPatterns = [
      /\$\s*(\d+(?:[,.]\d{2})?)/g, // $45.50 or $45
      /(\d+(?:[,.]\d{2})?)\s*dollars?/gi, // 45 dollars
      /(\d+(?:[,.]\d{2})?)\s*(?:USD|EUR|GBP|CAD)/gi, // 45 USD
    ];

    for (const pattern of amountPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);

        if (!isNaN(amount) && amount > 0) {
          return {
            value: amount.toFixed(2),
            confidence: 0.9,
            source: 'explicit',
            needsReview: false,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract currency from text
   */
  extractCurrency(text: string, defaultCurrency?: string): ExtractedField | undefined {
    const currencyPatterns = [
      { pattern: /\$|USD/i, currency: 'USD' },
      { pattern: /€|EUR/i, currency: 'EUR' },
      { pattern: /£|GBP/i, currency: 'GBP' },
      { pattern: /CAD/i, currency: 'CAD' },
      { pattern: /AUD/i, currency: 'AUD' },
    ];

    for (const { pattern, currency } of currencyPatterns) {
      if (pattern.test(text)) {
        return {
          value: currency,
          confidence: 0.9,
          source: 'explicit',
          needsReview: false,
        };
      }
    }

    // Default currency
    return {
      value: defaultCurrency || 'USD',
      confidence: 0.6,
      source: 'default',
      needsReview: true,
    };
  }

  /**
   * Extract purpose from text
   */
  extractPurpose(
    text: string,
    date?: ExtractedField,
    amount?: ExtractedField,
  ): ExtractedField | undefined {
    let purpose = text;

    // Remove date mentions
    if (date) {
      purpose = purpose.replace(/\b(today|yesterday|last week)\b/gi, '');
      purpose = purpose.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, '');
      purpose = purpose.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g, '');
    }

    // Remove amount mentions
    if (amount) {
      purpose = purpose.replace(/\$\s*\d+(?:[,.]\d{2})?/g, '');
      purpose = purpose.replace(/\d+(?:[,.]\d{2})?\s*dollars?/gi, '');
      purpose = purpose.replace(/\d+(?:[,.]\d{2})?\s*(?:USD|EUR|GBP|CAD)/gi, '');
    }

    // Remove common filler words
    purpose = purpose.replace(/\b(i spent|i paid|for|on|at|the)\b/gi, '');

    // Clean up whitespace
    purpose = purpose.trim().replace(/\s+/g, ' ');

    if (purpose.length < 5) {
      return undefined;
    }

    const confidence = purpose.length >= 10 ? 0.8 : 0.6;

    return {
      value: purpose,
      confidence,
      source: 'explicit',
      needsReview: purpose.length < 10,
    };
  }

  /**
   * Infer category from text
   */
  inferCategory(text: string, purpose?: string): ExtractedField | undefined {
    const lowerText = text.toLowerCase();
    const lowerPurpose = purpose?.toLowerCase() || '';

    const categories = [
      { keywords: ['lunch', 'dinner', 'breakfast', 'meal', 'restaurant', 'cafe', 'coffee', 'food'], category: 'meals' },
      { keywords: ['taxi', 'uber', 'lyft', 'flight', 'hotel', 'rental', 'gas', 'parking', 'airport'], category: 'travel' },
      { keywords: ['office', 'supplies', 'paper', 'pen', 'staples', 'depot'], category: 'supplies' },
      { keywords: ['software', 'subscription', 'saas', 'license', 'cloud', 'app'], category: 'software' },
    ];

    for (const { keywords, category } of categories) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword) || lowerPurpose.includes(keyword)) {
          return {
            value: category,
            confidence: 0.75,
            source: 'inferred',
            needsReview: false,
          };
        }
      }
    }

    // Default to 'other'
    return {
      value: 'other',
      confidence: 0.5,
      source: 'default',
      needsReview: true,
    };
  }
}
```

### Existing Code Patterns

From `src/backend/services/ocr-parser.service.ts`:
```typescript
// Field extraction pattern
private parseDate(text: string, confidence: number): FieldData | undefined {
  const patterns = [/* regex patterns */];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return {
        value: match[0],
        confidence,
        needsReview: confidence < threshold,
      };
    }
  }
  return undefined;
}
```

---

## Testing

### Unit Tests (`src/backend/services/nlp.service.spec.ts`)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NLPService } from './nlp.service';

describe('NLPService', () => {
  let service: NLPService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NLPService],
    }).compile();

    service = module.get<NLPService>(NLPService);
  });

  describe('extractInvoice', () => {
    it('should extract invoice from simple text', async () => {
      const result = await service.extractInvoice({
        text: 'I spent $45.50 on lunch with a client on December 4th',
      });

      expect(result.success).toBe(true);
      expect(result.invoice?.amount?.value).toBe('45.50');
      expect(result.invoice?.date?.value).toMatch(/2025-12-04/);
      expect(result.invoice?.purpose?.value).toContain('lunch');
      expect(result.invoice?.category?.value).toBe('meals');
    });

    it('should handle relative dates', async () => {
      const result = await service.extractInvoice({
        text: 'Taxi ride yesterday for $32',
        context: { currentDate: '2025-12-05' },
      });

      expect(result.success).toBe(true);
      expect(result.invoice?.date?.value).toBe('2025-12-04');
      expect(result.invoice?.amount?.value).toBe('32.00');
      expect(result.invoice?.category?.value).toBe('travel');
    });

    it('should handle "today" as date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = await service.extractInvoice({
        text: 'Software subscription renewal today, $99',
      });

      expect(result.success).toBe(true);
      expect(result.invoice?.date?.value).toBe(today);
      expect(result.invoice?.amount?.value).toBe('99.00');
      expect(result.invoice?.category?.value).toBe('software');
    });

    it('should extract amount in different formats', async () => {
      const testCases = [
        { text: 'Lunch $45.50', expected: '45.50' },
        { text: 'Lunch 45 dollars', expected: '45.00' },
        { text: 'Lunch 45.50 USD', expected: '45.50' },
      ];

      for (const { text, expected } of testCases) {
        const result = await service.extractInvoice({ text });
        expect(result.invoice?.amount?.value).toBe(expected);
      }
    });

    it('should infer currency from text', async () => {
      const testCases = [
        { text: 'Lunch $45', expected: 'USD' },
        { text: 'Lunch €45', expected: 'EUR' },
        { text: 'Lunch £45', expected: 'GBP' },
        { text: 'Lunch 45 CAD', expected: 'CAD' },
      ];

      for (const { text, expected } of testCases) {
        const result = await service.extractInvoice({ text });
        expect(result.invoice?.currency?.value).toBe(expected);
      }
    });

    it('should infer category from keywords', async () => {
      const testCases = [
        { text: 'Restaurant dinner $50', expected: 'meals' },
        { text: 'Uber to airport $35', expected: 'travel' },
        { text: 'Office supplies $20', expected: 'supplies' },
        { text: 'Software license $99', expected: 'software' },
      ];

      for (const { text, expected } of testCases) {
        const result = await service.extractInvoice({ text });
        expect(result.invoice?.category?.value).toBe(expected);
      }
    });

    it('should flag ambiguous inputs', async () => {
      const result = await service.extractInvoice({
        text: 'Lunch',
      });

      expect(result.success).toBe(true);
      expect(result.ambiguities).toBeDefined();
      expect(result.ambiguities!.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for unclear inputs', async () => {
      const result = await service.extractInvoice({
        text: 'Spent money on food',
      });

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should handle very short input', async () => {
      const result = await service.extractInvoice({
        text: 'Hi',
      });

      expect(result.success).toBe(false);
      expect(result.ambiguities).toContain('Input text is too short. Please provide more details.');
    });

    it('should extract purpose correctly', async () => {
      const result = await service.extractInvoice({
        text: 'I spent $45.50 on lunch with a client at downtown restaurant on December 4th',
      });

      expect(result.invoice?.purpose?.value).toContain('lunch');
      expect(result.invoice?.purpose?.value).toContain('client');
      expect(result.invoice?.purpose?.value).toContain('restaurant');
    });

    it('should handle complex date formats', async () => {
      const testCases = [
        { text: 'Lunch on December 4th, $45', expected: /2025-12-04/ },
        { text: 'Lunch on 12/04/2025, $45', expected: /2025-12-04/ },
        { text: 'Lunch on 2025-12-04, $45', expected: /2025-12-04/ },
      ];

      for (const { text, expected } of testCases) {
        const result = await service.extractInvoice({ text });
        expect(result.invoice?.date?.value).toMatch(expected);
      }
    });

    it('should calculate confidence score', async () => {
      const result = await service.extractInvoice({
        text: 'I spent $45.50 on lunch with a client on December 4th',
      });

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle missing amount', async () => {
      const result = await service.extractInvoice({
        text: 'Lunch with client yesterday',
      });

      expect(result.ambiguities).toContain('Amount is unclear. Please specify the amount (e.g., "$45.50" or "45 dollars").');
    });

    it('should handle missing date', async () => {
      const result = await service.extractInvoice({
        text: 'Lunch $45',
      });

      // Should default to today
      expect(result.invoice?.date).toBeDefined();
      expect(result.invoice?.date?.needsReview).toBe(true);
    });
  });
});
```

### Integration Tests

```typescript
describe('NLP Integration', () => {
  it('should complete full NLP extraction and invoice submission', async () => {
    // 1. Extract invoice from text
    const nlpResult = await nlpService.extractInvoice({
      text: 'I spent $125.75 on team dinner with clients at steakhouse yesterday',
      context: { currentDate: '2025-12-05' },
    });

    expect(nlpResult.success).toBe(true);
    expect(nlpResult.invoice).toBeDefined();

    // 2. Use extracted data to submit invoice
    const invoicePayload = {
      date: nlpResult.invoice!.date!.value,
      amount: parseFloat(nlpResult.invoice!.amount!.value),
      currency: nlpResult.invoice!.currency!.value,
      purpose: nlpResult.invoice!.purpose!.value,
      category: nlpResult.invoice!.category!.value,
    };

    const submitResult = await invoiceMockAPI.submit(invoicePayload);
    expect(submitResult.invoiceId).toBeTruthy();
  });
});
```

---

## Acceptance Criteria

- [ ] Extracts date from text (absolute and relative)
- [ ] Extracts amount from text (various formats)
- [ ] Extracts currency from text (USD, EUR, GBP, etc.)
- [ ] Extracts purpose from text
- [ ] Infers category from keywords
- [ ] Returns confidence scores for each field
- [ ] Flags ambiguous inputs with clear messages
- [ ] Provides suggestions for improving input
- [ ] Handles "today", "yesterday", "last week" correctly
- [ ] Handles various amount formats ($45, 45 dollars, 45.50 USD)
- [ ] Processing time < 100ms P95
- [ ] All unit tests pass (> 90% coverage)
- [ ] Integration tests pass

---

## Definition of Done

- [ ] Code complete and follows TypeScript best practices
- [ ] All unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code coverage > 90%
- [ ] Code reviewed by Architect
- [ ] Documentation updated (inline comments)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Performance tested (< 100ms P95)
- [ ] Manual testing with various text inputs

---

## Notes

- This is a deterministic approach using regex and heuristics
- Future enhancement: Use LLM for complex/ambiguous cases
- Confidence scoring helps identify when to ask clarifying questions
- Category inference is keyword-based (will be improved with ML)
- Supports common date formats and relative dates
- Supports common amount formats and currencies
- Purpose extraction removes date/amount mentions to get clean text

---

**Related Stories**:
- STORY-MCP-002: Invoice Mock API (will use NLP-extracted data)
- STORY-OCR-001: OCR Service (alternative to NLP)
- STORY-AGENT-001: LangChain Agent Core (will call NLP service)
