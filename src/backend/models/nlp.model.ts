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
