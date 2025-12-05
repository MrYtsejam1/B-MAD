import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { OCRRequest, OCRResult, OCRConfig, InvoiceData } from '../models/ocr.model';
import { OCRParserService } from './ocr-parser.service';

export class OCRService {
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

  async processReceipt(request: OCRRequest): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      this.validateFile(request);
      const preprocessedImage = await this.preprocessImage(request.imageBuffer);
      const ocrResult = await this.extractText(preprocessedImage);
      const invoiceData = this.parser.parseInvoice(
        ocrResult.text,
        ocrResult.confidence,
        this.config.confidenceThreshold,
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        rawText: ocrResult.text,
        confidence: ocrResult.confidence / 100,
        invoice: invoiceData,
        processingTime,
        warnings: this.generateWarnings(invoiceData, ocrResult.confidence),
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`OCR failed: ${error.message}`, error.stack);

      return {
        success: false,
        rawText: '',
        confidence: 0,
        processingTime,
        errors: [error.message],
      };
    }
  }

  private validateFile(request: OCRRequest): void {
    if (!request.imageBuffer || request.imageBuffer.length === 0) {
      throw new Error('Image buffer is empty');
    }

    if (request.imageBuffer.length > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize / 1024 / 1024}MB`);
    }

    if (!this.config.supportedFormats.includes(request.mimeType)) {
      throw new Error(`Unsupported file format: ${request.mimeType}. Supported formats: ${this.config.supportedFormats.join(', ')}`);
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const processed = await sharp(imageBuffer)
        .grayscale()
        .normalize() // Enhance contrast
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();

      return processed;
    } catch (error: any) {
      console.warn(`Image preprocessing failed: ${error.message}`);
      return imageBuffer;
    }
  }

  private async extractText(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const result = await Tesseract.recognize(imageBuffer, this.config.language, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error: any) {
      console.error(`Tesseract OCR failed: ${error.message}`);
      throw new Error('OCR text extraction failed');
    }
  }

  private generateWarnings(invoiceData: InvoiceData, confidence: number): string[] | undefined {
    const warnings: string[] = [];

    if (confidence < this.config.confidenceThreshold * 100) {
      warnings.push(`Overall OCR confidence (${confidence.toFixed(1)}%) is below threshold (${this.config.confidenceThreshold * 100}%)`);
    }

    if (invoiceData.date?.needsReview) {
      warnings.push('Date field requires manual review');
    }

    if (invoiceData.amount?.needsReview) {
      warnings.push('Amount field requires manual review');
    }

    if (invoiceData.vendor?.needsReview) {
      warnings.push('Vendor field requires manual review');
    }

    if (!invoiceData.date) {
      warnings.push('Date not found in receipt');
    }

    if (!invoiceData.amount) {
      warnings.push('Amount not found in receipt');
    }

    return warnings.length > 0 ? warnings : undefined;
  }
}
