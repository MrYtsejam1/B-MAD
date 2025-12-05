# STORY-OCR-001: OCR Service

**Sprint**: 1  
**Points**: 8  
**Priority**: P0 (Must Have)  
**Owner**: Developer Agent  
**Status**: Not Started  
**Dependencies**: None

---

## Context

### PRD Reference (Embedded)

From `/docs/phase2-planning/prd.md`:

> **FR-4: Receipt Upload (Optional)**
> 
> **FR-4.1**: System SHALL support optional receipt image upload  
> **FR-4.2**: System SHALL extract text from receipt images using OCR  
> **FR-4.3**: System SHALL identify invoice fields (date, amount, vendor, etc.)  
> **FR-4.4**: System SHALL return confidence scores for extracted data  
> **FR-4.5**: System SHALL support common image formats (JPG, PNG, PDF)  
> **FR-4.6**: System SHALL enforce file size limits (< 10MB)  
> **FR-4.7**: System SHALL process receipts in < 5 seconds (P95)

> **NFR-2: Performance**
> 
> **NFR-2.3**: OCR processing SHALL complete in < 5 seconds (P95)  
> **NFR-2.4**: OCR confidence threshold SHALL be 0.7 (70%)

### Architecture Reference (Embedded)

From `/docs/ARCHITECTURE_PLAN.md`:

> **OCR Service**
> 
> **Purpose**: Extract invoice data from receipt images
> 
> **Technology**: Tesseract.js (JavaScript OCR library)
> 
> **Process**:
> 1. Receive uploaded receipt image
> 2. Preprocess image (resize, grayscale, contrast enhancement)
> 3. Extract text using Tesseract.js
> 4. Parse invoice fields (date, amount, vendor, category)
> 5. Return structured data with confidence scores
> 
> **Supported Formats**: JPG, PNG, PDF (first page only)
> 
> **Performance Optimization**:
> - Image preprocessing to improve OCR accuracy
> - Worker threads for parallel processing
> - Caching of OCR results
> - Fast path for small images
> 
> **Confidence Threshold**: 0.7 (70%)
> - Fields with confidence < 0.7 flagged for manual review

---

## Requirements

### Functional Requirements

- [ ] Accept receipt image uploads (JPG, PNG, PDF)
- [ ] Enforce file size limit (< 10MB)
- [ ] Preprocess images for better OCR accuracy
- [ ] Extract text from images using Tesseract.js
- [ ] Parse invoice fields (date, amount, vendor, category)
- [ ] Return confidence scores for each field
- [ ] Flag low-confidence fields (< 0.7) for manual review
- [ ] Handle OCR errors gracefully
- [ ] Support concurrent OCR requests

### Non-Functional Requirements

- [ ] Processing time < 5s P95 for typical receipts
- [ ] Memory usage < 500MB per request
- [ ] Thread-safe for concurrent requests
- [ ] Comprehensive error logging
- [ ] Support for multiple languages (English, Spanish, French)

---

## Implementation

### Files to Create

1. **`src/backend/services/ocr.service.ts`** (Main OCR service)
2. **`src/backend/services/ocr-parser.service.ts`** (Invoice field parser)
3. **`src/backend/models/ocr.model.ts`** (TypeScript interfaces)
4. **`src/backend/middleware/upload.middleware.ts`** (File upload handling)
5. **`src/backend/controllers/ocr.controller.ts`** (OCR endpoints)
6. **`src/backend/services/ocr.service.spec.ts`** (Unit tests)
7. **`test-fixtures/receipts/`** (Sample receipt images)

### Code Structure

**`src/backend/models/ocr.model.ts`**:
```typescript
export interface OCRRequest {
  imageBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface OCRResult {
  success: boolean;
  rawText: string;
  confidence: number;
  invoice?: InvoiceData;
  processingTime: number;
  warnings?: string[];
  errors?: string[];
}

export interface InvoiceData {
  date?: FieldData;
  amount?: FieldData;
  vendor?: FieldData;
  category?: FieldData;
  currency?: FieldData;
  items?: ItemData[];
}

export interface FieldData {
  value: string;
  confidence: number;
  needsReview: boolean;
}

export interface ItemData {
  description: string;
  quantity?: number;
  price?: number;
  confidence: number;
}

export interface OCRConfig {
  language: string;
  confidenceThreshold: number;
  maxFileSize: number;
  supportedFormats: string[];
}
```

**`src/backend/services/ocr.service.ts`**:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { OCRRequest, OCRResult, OCRConfig } from '../models/ocr.model';
import { OCRParserService } from './ocr-parser.service';

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);
  private readonly parser: OCRParserService;
  private readonly config: OCRConfig = {
    language: 'eng',
    confidenceThreshold: 0.7,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  };

  constructor() {
    this.parser = new OCRParserService();
  }

  /**
   * Process receipt image and extract invoice data
   */
  async processReceipt(request: OCRRequest): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Validate file
      this.validateFile(request);

      // Preprocess image
      const preprocessedImage = await this.preprocessImage(request.imageBuffer);

      // Extract text using Tesseract
      const ocrResult = await this.extractText(preprocessedImage);

      // Parse invoice fields
      const invoiceData = this.parser.parseInvoice(
        ocrResult.text,
        ocrResult.confidence,
        this.config.confidenceThreshold,
      );

      const processingTime = Date.now() - startTime;

      this.logger.log(`OCR completed in ${processingTime}ms (confidence: ${ocrResult.confidence}%)`);

      return {
        success: true,
        rawText: ocrResult.text,
        confidence: ocrResult.confidence / 100,
        invoice: invoiceData,
        processingTime,
        warnings: this.generateWarnings(invoiceData, ocrResult.confidence),
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`OCR failed: ${error.message}`, error.stack);

      return {
        success: false,
        rawText: '',
        confidence: 0,
        processingTime,
        errors: [error.message],
      };
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(request: OCRRequest): void {
    // Check file size
    if (request.imageBuffer.length > this.config.maxFileSize) {
      throw new Error(`File size exceeds limit (${this.config.maxFileSize / 1024 / 1024}MB)`);
    }

    // Check file format
    if (!this.config.supportedFormats.includes(request.mimeType)) {
      throw new Error(`Unsupported file format: ${request.mimeType}`);
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Convert to grayscale, enhance contrast, resize if needed
      const processed = await sharp(imageBuffer)
        .grayscale()
        .normalize() // Enhance contrast
        .resize(2000, 2000, { // Resize large images
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();

      return processed;
    } catch (error) {
      this.logger.warn(`Image preprocessing failed: ${error.message}`);
      // Return original if preprocessing fails
      return imageBuffer;
    }
  }

  /**
   * Extract text from image using Tesseract
   */
  private async extractText(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const result = await Tesseract.recognize(imageBuffer, this.config.language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      this.logger.error(`Tesseract OCR failed: ${error.message}`);
      throw new Error('OCR text extraction failed');
    }
  }

  /**
   * Generate warnings for low-confidence fields
   */
  private generateWarnings(invoiceData: any, overallConfidence: number): string[] {
    const warnings: string[] = [];

    if (overallConfidence < 70) {
      warnings.push('Overall OCR confidence is low. Please review extracted data carefully.');
    }

    if (invoiceData?.date?.needsReview) {
      warnings.push('Date field has low confidence. Please verify.');
    }

    if (invoiceData?.amount?.needsReview) {
      warnings.push('Amount field has low confidence. Please verify.');
    }

    if (invoiceData?.vendor?.needsReview) {
      warnings.push('Vendor field has low confidence. Please verify.');
    }

    return warnings;
  }
}
```

**`src/backend/services/ocr-parser.service.ts`**:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InvoiceData, FieldData } from '../models/ocr.model';

@Injectable()
export class OCRParserService {
  private readonly logger = new Logger(OCRParserService.name);

  /**
   * Parse invoice fields from OCR text
   */
  parseInvoice(text: string, overallConfidence: number, threshold: number): InvoiceData {
    const invoice: InvoiceData = {};

    // Parse date
    invoice.date = this.parseDate(text, overallConfidence, threshold);

    // Parse amount
    invoice.amount = this.parseAmount(text, overallConfidence, threshold);

    // Parse vendor
    invoice.vendor = this.parseVendor(text, overallConfidence, threshold);

    // Parse currency
    invoice.currency = this.parseCurrency(text, overallConfidence, threshold);

    // Parse category (heuristic-based)
    invoice.category = this.parseCategory(text, invoice.vendor?.value, overallConfidence, threshold);

    return invoice;
  }

  /**
   * Parse date from OCR text
   */
  private parseDate(text: string, overallConfidence: number, threshold: number): FieldData | undefined {
    // Common date patterns
    const patterns = [
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g, // MM/DD/YYYY or DD/MM/YYYY
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g, // YYYY/MM/DD
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2}),? (\d{4})\b/gi, // Month DD, YYYY
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        const dateStr = match[0];
        const confidence = overallConfidence / 100;

        return {
          value: this.normalizeDate(dateStr),
          confidence,
          needsReview: confidence < threshold,
        };
      }
    }

    return undefined;
  }

  /**
   * Parse amount from OCR text
   */
  private parseAmount(text: string, overallConfidence: number, threshold: number): FieldData | undefined {
    // Common amount patterns
    const patterns = [
      /\b(?:total|amount|subtotal|sum)[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})\b/gi,
      /\b\$\s*(\d+[,.]?\d*\.?\d{2})\b/g,
      /\b(\d+[,.]?\d*\.?\d{2})\s*(?:USD|EUR|GBP|CAD)\b/gi,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);

        if (!isNaN(amount) && amount > 0) {
          const confidence = overallConfidence / 100;

          return {
            value: amount.toFixed(2),
            confidence,
            needsReview: confidence < threshold,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Parse vendor from OCR text
   */
  private parseVendor(text: string, overallConfidence: number, threshold: number): FieldData | undefined {
    // Vendor is typically in the first few lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length > 0) {
      // Take first non-empty line as vendor
      const vendor = lines[0].trim();
      const confidence = overallConfidence / 100;

      return {
        value: vendor,
        confidence,
        needsReview: confidence < threshold,
      };
    }

    return undefined;
  }

  /**
   * Parse currency from OCR text
   */
  private parseCurrency(text: string, overallConfidence: number, threshold: number): FieldData | undefined {
    const currencyPatterns = [
      { pattern: /\$|USD/i, currency: 'USD' },
      { pattern: /€|EUR/i, currency: 'EUR' },
      { pattern: /£|GBP/i, currency: 'GBP' },
      { pattern: /CAD/i, currency: 'CAD' },
      { pattern: /AUD/i, currency: 'AUD' },
    ];

    for (const { pattern, currency } of currencyPatterns) {
      if (pattern.test(text)) {
        const confidence = overallConfidence / 100;

        return {
          value: currency,
          confidence,
          needsReview: confidence < threshold,
        };
      }
    }

    // Default to USD if no currency found
    return {
      value: 'USD',
      confidence: 0.5,
      needsReview: true,
    };
  }

  /**
   * Parse category from OCR text (heuristic-based)
   */
  private parseCategory(
    text: string,
    vendor: string | undefined,
    overallConfidence: number,
    threshold: number,
  ): FieldData | undefined {
    const lowerText = text.toLowerCase();
    const lowerVendor = vendor?.toLowerCase() || '';

    // Category keywords
    const categories = [
      { keywords: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'food', 'meal'], category: 'meals' },
      { keywords: ['hotel', 'flight', 'airline', 'uber', 'lyft', 'taxi', 'rental', 'gas'], category: 'travel' },
      { keywords: ['office', 'supplies', 'staples', 'depot', 'paper', 'pen'], category: 'supplies' },
      { keywords: ['software', 'subscription', 'saas', 'license', 'cloud'], category: 'software' },
    ];

    for (const { keywords, category } of categories) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword) || lowerVendor.includes(keyword)) {
          const confidence = overallConfidence / 100 * 0.8; // Lower confidence for heuristic

          return {
            value: category,
            confidence,
            needsReview: confidence < threshold,
          };
        }
      }
    }

    // Default to 'other' if no category matched
    return {
      value: 'other',
      confidence: 0.5,
      needsReview: true,
    };
  }

  /**
   * Normalize date to ISO 8601 format (YYYY-MM-DD)
   */
  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      this.logger.warn(`Failed to normalize date: ${dateStr}`);
    }
    return dateStr; // Return original if normalization fails
  }
}
```

**`src/backend/middleware/upload.middleware.ts`**:
```typescript
import { Request } from 'express';
import multer from 'multer';
import { BadRequestException } from '@nestjs/common';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed: JPG, PNG, PDF`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});
```

**`src/backend/controllers/ocr.controller.ts`**:
```typescript
import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OCRService } from '../services/ocr.service';
import { uploadMiddleware } from '../middleware/upload.middleware';

@Controller('api/v1/ocr')
export class OCRController {
  constructor(private readonly ocrService: OCRService) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('receipt', uploadMiddleware))
  async processReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.ocrService.processReceipt({
      imageBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    return result;
  }
}
```

### Existing Code Patterns

From `src/backend/services/langchain.service.ts`:
```typescript
// Service initialization pattern
constructor() {
  this.logger = new Logger(LangChainService.name);
}

// Error handling pattern
try {
  // Operation
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new Error('User-friendly error message');
}
```

---

## Testing

### Unit Tests (`src/backend/services/ocr.service.spec.ts`)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OCRService } from './ocr.service';
import * as fs from 'fs';
import * as path from 'path';

describe('OCRService', () => {
  let service: OCRService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OCRService],
    }).compile();

    service = module.get<OCRService>(OCRService);
  });

  describe('processReceipt', () => {
    it('should extract invoice data from receipt image', async () => {
      const imagePath = path.join(__dirname, '../../../test-fixtures/receipts/sample-receipt-1.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      const result = await service.processReceipt({
        imageBuffer,
        fileName: 'sample-receipt-1.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.success).toBe(true);
      expect(result.rawText).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.invoice).toBeDefined();
      expect(result.processingTime).toBeLessThan(5000); // < 5s
    });

    it('should extract date from receipt', async () => {
      const imagePath = path.join(__dirname, '../../../test-fixtures/receipts/sample-receipt-1.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      const result = await service.processReceipt({
        imageBuffer,
        fileName: 'sample-receipt-1.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.invoice?.date).toBeDefined();
      expect(result.invoice?.date?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should extract amount from receipt', async () => {
      const imagePath = path.join(__dirname, '../../../test-fixtures/receipts/sample-receipt-1.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      const result = await service.processReceipt({
        imageBuffer,
        fileName: 'sample-receipt-1.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.invoice?.amount).toBeDefined();
      expect(parseFloat(result.invoice?.amount?.value || '0')).toBeGreaterThan(0);
    });

    it('should extract vendor from receipt', async () => {
      const imagePath = path.join(__dirname, '../../../test-fixtures/receipts/sample-receipt-1.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      const result = await service.processReceipt({
        imageBuffer,
        fileName: 'sample-receipt-1.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.invoice?.vendor).toBeDefined();
      expect(result.invoice?.vendor?.value.length).toBeGreaterThan(0);
    });

    it('should flag low-confidence fields for review', async () => {
      // Use a low-quality receipt image
      const imagePath = path.join(__dirname, '../../../test-fixtures/receipts/low-quality-receipt.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      const result = await service.processReceipt({
        imageBuffer,
        fileName: 'low-quality-receipt.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should reject files exceeding size limit', async () => {
      // Create a large buffer (> 10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await expect(
        service.processReceipt({
          imageBuffer: largeBuffer,
          fileName: 'large-file.jpg',
          mimeType: 'image/jpeg',
        })
      ).rejects.toThrow('File size exceeds limit');
    });

    it('should reject unsupported file formats', async () => {
      const buffer = Buffer.from('test');

      await expect(
        service.processReceipt({
          imageBuffer: buffer,
          fileName: 'test.txt',
          mimeType: 'text/plain',
        })
      ).rejects.toThrow('Unsupported file format');
    });

    it('should handle corrupted images gracefully', async () => {
      const corruptedBuffer = Buffer.from('not an image');

      const result = await service.processReceipt({
        imageBuffer: corruptedBuffer,
        fileName: 'corrupted.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
```

### Integration Tests

```typescript
describe('OCR Integration', () => {
  it('should complete full OCR workflow', async () => {
    // 1. Upload receipt
    const imagePath = path.join(__dirname, '../../../test-fixtures/receipts/sample-receipt-1.jpg');
    const imageBuffer = fs.readFileSync(imagePath);

    // 2. Process OCR
    const ocrResult = await ocrService.processReceipt({
      imageBuffer,
      fileName: 'sample-receipt-1.jpg',
      mimeType: 'image/jpeg',
    });

    expect(ocrResult.success).toBe(true);
    expect(ocrResult.invoice).toBeDefined();

    // 3. Use extracted data to submit invoice
    const invoicePayload = {
      date: ocrResult.invoice!.date!.value,
      amount: parseFloat(ocrResult.invoice!.amount!.value),
      currency: ocrResult.invoice!.currency!.value,
      purpose: `Receipt from ${ocrResult.invoice!.vendor!.value}`,
      category: ocrResult.invoice!.category!.value,
    };

    const submitResult = await invoiceMockAPI.submit(invoicePayload);
    expect(submitResult.invoiceId).toBeTruthy();
  });
});
```

---

## Acceptance Criteria

- [ ] Accepts JPG, PNG, PDF receipt uploads
- [ ] Enforces 10MB file size limit
- [ ] Preprocesses images for better OCR accuracy
- [ ] Extracts text using Tesseract.js
- [ ] Parses date field with >70% confidence
- [ ] Parses amount field with >70% confidence
- [ ] Parses vendor field with >70% confidence
- [ ] Infers currency from text (USD, EUR, GBP, etc.)
- [ ] Infers category from keywords (meals, travel, supplies, etc.)
- [ ] Flags low-confidence fields (< 0.7) for manual review
- [ ] Returns warnings for low-quality receipts
- [ ] Processes receipts in < 5s P95
- [ ] Handles corrupted images gracefully
- [ ] All unit tests pass (> 85% coverage)
- [ ] Integration tests pass

---

## Definition of Done

- [ ] Code complete and follows TypeScript best practices
- [ ] All unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code coverage > 85%
- [ ] Sample receipt images added to test-fixtures
- [ ] Code reviewed by Architect
- [ ] Documentation updated (inline comments)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Performance tested (< 5s P95)
- [ ] Manual testing with various receipt types

---

## Notes

- Tesseract.js runs in Node.js using WASM
- Image preprocessing significantly improves OCR accuracy
- Confidence threshold of 0.7 (70%) balances accuracy and usability
- Category inference is heuristic-based (will be improved with ML in future)
- PDF support is limited to first page only in Sprint 1
- Consider frontend OCR if backend performance is insufficient
- CSP headers must allow WASM worker loading

---

**Related Stories**:
- STORY-MCP-002: Invoice Mock API (will use OCR-extracted data)
- STORY-NLP-001: NLP Extraction (alternative to OCR)
- STORY-AGENT-001: LangChain Agent Core (will call OCR service)
