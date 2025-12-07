export interface OCRRequest {
  imageBuffer: Buffer;
  mimeType: string;
  filename?: string;
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
  currency?: FieldData;
  category?: FieldData;
  invoiceNumber?: FieldData;
}

export interface FieldData {
  value: string;
  confidence: number;
  needsReview: boolean;
}

export interface OCRConfig {
  language: string;
  confidenceThreshold: number;
  maxFileSize: number;
  supportedFormats: string[];
}
