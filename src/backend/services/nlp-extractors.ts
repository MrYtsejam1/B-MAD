import { ExtractedField } from '../models/nlp.model';

export class NLPExtractors {
  extractDate(text: string, currentDate?: string): ExtractedField | undefined {
    const lowerText = text.toLowerCase();
    const today = currentDate ? new Date(currentDate) : new Date();

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
          continue;
        }
      }
    }

    return {
      value: today.toISOString().split('T')[0],
      confidence: 0.5,
      source: 'default',
      needsReview: true,
    };
  }

  extractAmount(text: string): ExtractedField | undefined {
    const amountPatterns = [
      /\$\s*(\d+(?:[,.]\d{2})?)/g,
      /(\d+(?:[,.]\d{2})?)\s*dollars?/gi,
      /(\d+(?:[,.]\d{2})?)\s*(?:USD|EUR|GBP|CAD)/gi,
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

    return {
      value: defaultCurrency || 'USD',
      confidence: 0.6,
      source: 'default',
      needsReview: true,
    };
  }

  extractPurpose(text: string, date?: ExtractedField, amount?: ExtractedField): ExtractedField | undefined {
    let purpose = text;

    if (date) {
      purpose = purpose.replace(/\b(today|yesterday|last week)\b/gi, '');
      purpose = purpose.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, '');
      purpose = purpose.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g, '');
    }

    if (amount) {
      purpose = purpose.replace(/\$\s*\d+(?:[,.]\d{2})?/g, '');
      purpose = purpose.replace(/\d+(?:[,.]\d{2})?\s*dollars?/gi, '');
      purpose = purpose.replace(/\d+(?:[,.]\d{2})?\s*(?:USD|EUR|GBP|CAD)/gi, '');
    }

    purpose = purpose.replace(/\b(i spent|i paid|for|on|at|the)\b/gi, '');
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

    return {
      value: 'other',
      confidence: 0.5,
      source: 'default',
      needsReview: true,
    };
  }
}
