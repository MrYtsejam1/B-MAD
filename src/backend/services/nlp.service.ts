import { NLPRequest, NLPResult, InvoiceExtraction } from '../models/nlp.model';
import { NLPExtractors } from './nlp-extractors';

export class NLPService {
  private readonly extractors: NLPExtractors;
  private readonly _confidenceThreshold = 0.7; // Reserved for future confidence scoring

  constructor() {
    this.extractors = new NLPExtractors();
  }

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

      const invoice: InvoiceExtraction = {};
      const ambiguities: string[] = [];

      invoice.date = this.extractors.extractDate(text, request.context?.currentDate);
      if (!invoice.date || invoice.date.needsReview) {
        ambiguities.push('Date is unclear. Please specify the date (e.g., "December 4th" or "yesterday").');
      }

      invoice.amount = this.extractors.extractAmount(text);
      if (!invoice.amount || invoice.amount.needsReview) {
        ambiguities.push('Amount is unclear. Please specify the amount (e.g., "$45.50" or "45 dollars").');
      }

      invoice.currency = this.extractors.extractCurrency(text, request.context?.defaultCurrency);

      invoice.purpose = this.extractors.extractPurpose(text, invoice.date, invoice.amount);
      if (!invoice.purpose || invoice.purpose.value.length < 10) {
        ambiguities.push('Purpose is unclear. Please provide more details about the expense.');
      }

      invoice.category = this.extractors.inferCategory(text, invoice.purpose?.value);

      const confidence = this.calculateConfidence(invoice);

      console.log(`NLP extraction completed (confidence: ${confidence.toFixed(2)})`);

      return {
        success: true,
        invoice,
        confidence,
        ambiguities: ambiguities.length > 0 ? ambiguities : undefined,
        suggestions: this.generateSuggestions(invoice, ambiguities),
      };
    } catch (error: any) {
      console.error(`NLP extraction failed: ${error.message}`, error.stack);

      return {
        success: false,
        confidence: 0,
        ambiguities: ['Failed to parse input. Please try rephrasing.'],
      };
    }
  }

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
