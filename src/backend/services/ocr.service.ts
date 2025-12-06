import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { PDFParse } from 'pdf-parse';
import { OCRRequest, OCRResult, OCRConfig, InvoiceData } from '../models/ocr.model';
import { OCRParserService } from './ocr-parser.service';

export class OCRService {
  private readonly parser: OCRParserService;
  private readonly config: OCRConfig = {
    language: 'eng+heb', // Support both English and Hebrew for invoices
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
      
      // Handle PDFs separately - extract text directly without OCR
      if (request.mimeType === 'application/pdf') {
        return await this.processPdf(request.imageBuffer, startTime);
      }
      
      // For images, use Tesseract OCR
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
  
  /**
   * Process PDF files by extracting embedded text directly
   * If no meaningful text is found, fall back to image extraction + OCR
   */
  private async processPdf(pdfBuffer: Buffer, startTime: number): Promise<OCRResult> {
    try {
      console.log('[OCR] Processing PDF - extracting embedded text');
      const parser = new PDFParse({ data: pdfBuffer });
      const textResult = await parser.getText({ pageJoiner: '\n' });
      const text = textResult.text;
      
      console.log(`[OCR] Extracted ${text.length} characters from PDF`);
      console.log(`[OCR] First 200 chars: ${text.substring(0, 200)}`);
      
      // Check if extracted text is meaningful (has digits and reasonable length)
      // Scanned PDFs often only have page markers like "-- 1 of 1 --"
      const hasDigits = /\d/.test(text);
      const hasInvoiceKeywords = /(₪|ש"ח|NIS|USD|EUR|\$|invoice|חשבונית|סכום|total|amount|date|תאריך)/i.test(text);
      const isMeaningfulText = text.trim().length > 50 && hasDigits && hasInvoiceKeywords;
      
      if (!isMeaningfulText) {
        console.log('[OCR] PDF text not meaningful, falling back to image extraction + OCR');
        return await this.processPdfWithImageOcr(parser, startTime);
      }
      
      // Parse the extracted text for invoice data
      // Use high confidence since text is directly extracted, not OCR'd
      const invoiceData = this.parser.parseInvoice(text, 95, this.config.confidenceThreshold);
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        rawText: text,
        confidence: 0.95, // High confidence for direct text extraction
        invoice: invoiceData,
        processingTime,
        warnings: this.generateWarnings(invoiceData, 95),
      };
    } catch (error: any) {
      console.error(`[OCR] PDF parsing failed: ${error.message}`);
      return {
        success: false,
        rawText: '',
        confidence: 0,
        processingTime: Date.now() - startTime,
        errors: [`Failed to extract text from PDF: ${error.message}`],
      };
    }
  }
  
  /**
   * Fall back to extracting images from PDF and running Tesseract OCR
   * Used when PDF has no embedded text (scanned documents)
   * If no embedded images found, renders the page as a screenshot
   */
  private async processPdfWithImageOcr(parser: PDFParse, startTime: number): Promise<OCRResult> {
    try {
      console.log('[OCR] Extracting images from PDF for OCR');
      const imageResult = await parser.getImage({ 
        imageBuffer: true, 
        imageDataUrl: false,
        first: 1, // Only process first page for invoices
        imageThreshold: 0, // Include all images
      });
      
      console.log(`[OCR] getImage result: ${imageResult.pages.length} pages`);
      if (imageResult.pages.length > 0) {
        console.log(`[OCR] First page has ${imageResult.pages[0].images.length} images`);
      }
      
      let imageBuffer: Buffer;
      
      if (imageResult.pages.length > 0 && imageResult.pages[0].images.length > 0) {
        // Find the largest image (most likely the main invoice content)
        let largestImage = imageResult.pages[0].images[0];
        for (const image of imageResult.pages[0].images) {
          if (image.width * image.height > largestImage.width * largestImage.height) {
            largestImage = image;
          }
        }
        console.log(`[OCR] Using embedded image: ${largestImage.width}x${largestImage.height}`);
        imageBuffer = Buffer.from(largestImage.data);
      } else {
        // No embedded images - render the page as a screenshot
        console.log('[OCR] No embedded images found, rendering page as screenshot');
        const screenshotResult = await parser.getScreenshot({
          first: 1,
          imageBuffer: true,
          imageDataUrl: false,
          desiredWidth: 1200, // Good resolution for OCR
        });
        
        if (!screenshotResult.pages.length) {
          return {
            success: false,
            rawText: '',
            confidence: 0,
            processingTime: Date.now() - startTime,
            errors: ['PDF contains no extractable content. Please upload a screenshot or image of the invoice instead.'],
          };
        }
        
        const screenshot = screenshotResult.pages[0];
        console.log(`[OCR] Screenshot rendered: ${screenshot.width}x${screenshot.height}`);
        imageBuffer = Buffer.from(screenshot.data);
      }
      
      // Run through Tesseract OCR
      const preprocessedImage = await this.preprocessImage(imageBuffer);
      const ocrResult = await this.extractText(preprocessedImage);
      
      console.log(`[OCR] Tesseract extracted ${ocrResult.text.length} characters from PDF`);
      console.log(`[OCR] First 300 chars: ${ocrResult.text.substring(0, 300)}`);
      
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
      console.error(`[OCR] PDF image extraction failed: ${error.message}`);
      return {
        success: false,
        rawText: '',
        confidence: 0,
        processingTime: Date.now() - startTime,
        errors: [`Failed to extract images from PDF: ${error.message}. Please upload a screenshot or image of the invoice instead.`],
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
