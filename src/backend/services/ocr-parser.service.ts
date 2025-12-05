import { InvoiceData, FieldData } from '../models/ocr.model';

export class OCRParserService {
  parseInvoice(text: string, overallConfidence: number, threshold: number): InvoiceData {
    const invoice: InvoiceData = {};

    invoice.date = this.parseDate(text, overallConfidence, threshold);
    invoice.amount = this.parseAmount(text, overallConfidence, threshold);
    invoice.vendor = this.parseVendor(text, overallConfidence, threshold);
    invoice.currency = this.parseCurrency(text, overallConfidence, threshold);
    invoice.category = this.parseCategory(text, invoice.vendor?.value, overallConfidence, threshold);

    return invoice;
  }

  private parseDate(text: string, overallConfidence: number, threshold: number): FieldData | undefined {
    const patterns = [
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g,
      /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2}),? (\d{4})\b/gi,
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

  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
    }
    return dateStr;
  }

  private parseAmount(text: string, overallConfidence: number, threshold: number): FieldData | undefined {
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

  private parseVendor(text: string, overallConfidence: number, threshold: number): FieldData | undefined {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return undefined;
    }

    const vendorLine = lines[0].trim();
    
    if (vendorLine.length < 3 || vendorLine.length > 100) {
      return undefined;
    }

    const confidence = overallConfidence / 100;

    return {
      value: vendorLine,
      confidence,
      needsReview: confidence < threshold,
    };
  }

  private parseCurrency(text: string, overallConfidence: number, _threshold: number): FieldData | undefined {
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
          needsReview: false,
        };
      }
    }

    return {
      value: 'USD',
      confidence: 0.5,
      needsReview: true,
    };
  }

  private parseCategory(text: string, vendor: string | undefined, overallConfidence: number, _threshold: number): FieldData | undefined {
    const lowerText = text.toLowerCase();
    const lowerVendor = vendor?.toLowerCase() || '';

    const categories = [
      { keywords: ['restaurant', 'cafe', 'coffee', 'food', 'meal', 'lunch', 'dinner', 'breakfast'], category: 'meals' },
      { keywords: ['hotel', 'flight', 'airline', 'taxi', 'uber', 'lyft', 'rental', 'gas', 'parking'], category: 'travel' },
      { keywords: ['office', 'supplies', 'staples', 'depot', 'paper', 'pen'], category: 'supplies' },
      { keywords: ['software', 'subscription', 'saas', 'license', 'cloud', 'app'], category: 'software' },
    ];

    for (const { keywords, category } of categories) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword) || lowerVendor.includes(keyword)) {
          const confidence = overallConfidence / 100;

          return {
            value: category,
            confidence: confidence * 0.8, // Reduce confidence for inferred category
            needsReview: false,
          };
        }
      }
    }

    return {
      value: 'other',
      confidence: 0.5,
      needsReview: true,
    };
  }
}
