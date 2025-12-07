import { InferenceClient } from '@huggingface/inference';
import sharp from 'sharp';
import { PDFParse } from 'pdf-parse';
import { OCRRequest, OCRResult, OCRConfig, InvoiceData } from '../models/ocr.model';

// Vision-language model for OCR extraction
const VL_MODEL = 'Qwen/Qwen2.5-VL-7B-Instruct';

export class OCRService {
  private hf: InferenceClient | null = null;
  private readonly config: OCRConfig = {
    language: 'eng+heb', // Support both English and Hebrew for invoices
    confidenceThreshold: 0.7,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  };

  constructor() {
    const token = process.env.HF_TOKEN;
    if (token && token !== 'demo_key_not_configured') {
      this.hf = new InferenceClient(token);
      console.log('[OCR] Hugging Face Inference client initialized for vision model');
    } else {
      console.warn('[OCR] No HF_TOKEN configured, OCR will not work');
    }
  }

  async processReceipt(request: OCRRequest): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      this.validateFile(request);
      
      if (!this.hf) {
        throw new Error('OCR service not configured. Please set HF_TOKEN environment variable.');
      }
      
      // Convert PDF to image if needed
      let imageBuffer = request.imageBuffer;
      let mimeType = request.mimeType;
      
      if (mimeType === 'application/pdf') {
        console.log('[OCR] Converting PDF to image for vision model');
        const converted = await this.convertPdfToImage(request.imageBuffer);
        imageBuffer = converted.buffer;
        mimeType = converted.mimeType;
      }
      
      // Preprocess and encode image for vision model
      const processedImage = await this.preprocessImage(imageBuffer);
      const base64Image = processedImage.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      // Call vision-language model to extract invoice data
      console.log('[OCR] Calling Qwen2.5-VL vision model for invoice extraction');
      const invoiceData = await this.extractWithVisionModel(dataUrl);
      
      const processingTime = Date.now() - startTime;
      console.log(`[OCR] Vision model extraction completed in ${processingTime}ms`);

      return {
        success: true,
        rawText: JSON.stringify(invoiceData, null, 2),
        confidence: 0.9, // Vision models generally have high confidence
        invoice: invoiceData,
        processingTime,
        warnings: this.generateWarnings(invoiceData, 90),
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`[OCR] Vision model extraction failed: ${error.message}`, error.stack);

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
   * Extract invoice data using Qwen2.5-VL vision-language model
   * The model reads the invoice image and returns structured JSON
   */
  private async extractWithVisionModel(imageDataUrl: string): Promise<InvoiceData> {
    const prompt = `You are an OCR and invoice data extraction assistant. Analyze this invoice image (which may be in Hebrew or English) and extract the following information.

Return ONLY a valid JSON object with these exact fields (use null for any field you cannot find):
{
  "invoiceDate": "YYYY-MM-DD format date",
  "amount": number (the total amount to pay, as a number without currency symbols),
  "currency": "ILS" or "USD" or "EUR",
  "vendor": "business/vendor name string",
  "invoiceNumber": "invoice/receipt number string",
  "category": "food" or "parking" or "hotel" or "flight" or "conference" or "software" or "other"
}

IMPORTANT EXTRACTION RULES:

1. INVOICE NUMBER - Look for these patterns:
   - Hebrew: "מספר חשבונית", "מספר מסמך", "מזהה חשבונית", "קבלה מס'", "קבלה מספר", "מס' קבלה"
   - English: "Invoice #", "Receipt #", "Document No.", "Invoice Number"
   - Usually a numeric or alphanumeric code near the top of the document

2. AMOUNT - Look for the TOTAL amount to pay:
   - Hebrew: "סה"כ לתשלום", "סה"כ", "סכום לתשלום", "לתשלום"
   - English: "Total", "Amount Due", "Grand Total"
   - Return as a number (e.g., 2164.50, not "2,164.50")

3. VENDOR - The business/company name:
   - Usually at the top of the invoice in large text
   - Look for the company logo or header area
   - NOT the customer name
   - IMPORTANT: The invoice text is ONLY in Hebrew and English.
     Do NOT output Chinese characters or any other script.
     If you see characters that look like Chinese, they are actually Hebrew - output them as Hebrew.

4. CATEGORY - Infer from the vendor name and invoice content:
   - Restaurant, cafe, food delivery, catering => "food"
     Examples: "מסעדת גחלים", "קפה גרג", "וולט", "תן ביס"
   - Hotel, accommodation, lodging => "hotel"
     Examples: "מלון דן", "מלון הילטון", "Airbnb"
   - Parking lot, parking service => "parking"
     Examples: "חניון עזריאלי", "אחוזת החוף חניונים"
   - Airline, flight, aviation => "flight"
     Examples: "אל על", "ישראייר", "El Al", "Israir"
   - Conference, seminar, course, training => "conference"
     Examples: "כנס הייטק", "קורס מקצועי"
   - Software, IT services, tech consulting => "software"
     Examples: "כהן שירותי מחשוב", "יועצי תוכנה", "חברת הייטק"
   - Legal, accounting, and anything else => "other"
     Examples: "עורכי דין", "רואי חשבון"
   
   IMPORTANT: If you are not confident it is food, hotel, parking, flight, conference, or software, choose "other".

Return ONLY the JSON object, no explanations or additional text.`;

    try {
      const response = await this.hf!.chatCompletion({
        model: VL_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ] as any
          }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for more deterministic extraction
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('[OCR] Vision model raw response:', content);
      
      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Vision model did not return valid JSON');
      }
      
      const extracted = JSON.parse(jsonMatch[0]);
      console.log('[OCR] Parsed extraction:', extracted);
      
      // Convert to InvoiceData format with FieldData structure
      return this.convertToInvoiceData(extracted);
    } catch (error: any) {
      console.error('[OCR] Vision model call failed:', error.message);
      throw new Error(`Vision model extraction failed: ${error.message}`);
    }
  }
  
  /**
   * Convert raw extracted JSON to InvoiceData format with FieldData structure
   */
  private convertToInvoiceData(extracted: any): InvoiceData {
    const result: InvoiceData = {};
    
    if (extracted.invoiceDate) {
      result.date = {
        value: extracted.invoiceDate,
        confidence: 0.9,
        needsReview: false,
      };
    }
    
    if (extracted.amount != null) {
      result.amount = {
        value: String(extracted.amount),
        confidence: 0.9,
        needsReview: false,
      };
    }
    
    if (extracted.currency) {
      result.currency = {
        value: extracted.currency,
        confidence: 0.9,
        needsReview: false,
      };
    }
    
    if (extracted.vendor) {
      // Clean vendor name by removing CJK characters (Chinese/Japanese/Korean)
      // Qwen model sometimes confuses Hebrew with Chinese characters
      const cleanedVendor = this.cleanVendorName(extracted.vendor);
      console.log('[OCR] Vendor raw vs cleaned:', { raw: extracted.vendor, cleaned: cleanedVendor });
      
      result.vendor = {
        value: cleanedVendor || extracted.vendor,
        confidence: 0.9,
        needsReview: false,
      };
    }
    
    if (extracted.invoiceNumber) {
      result.invoiceNumber = {
        value: extracted.invoiceNumber,
        confidence: 0.9,
        needsReview: false,
      };
    }
    
    if (extracted.category) {
      result.category = {
        value: extracted.category,
        confidence: 0.8,
        needsReview: false,
      };
    }
    
    return result;
  }
  
  /**
   * Convert PDF to image for vision model processing
   */
  private async convertPdfToImage(pdfBuffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      
      // Try to render the page as a screenshot
      const screenshotResult = await parser.getScreenshot({
        first: 1,
        imageBuffer: true,
        imageDataUrl: false,
        desiredWidth: 1200,
      });
      
      if (screenshotResult.pages.length > 0) {
        const screenshot = screenshotResult.pages[0];
        console.log(`[OCR] PDF rendered to image: ${screenshot.width}x${screenshot.height}`);
        return {
          buffer: Buffer.from(screenshot.data),
          mimeType: 'image/png',
        };
      }
      
      throw new Error('Could not render PDF page');
    } catch (error: any) {
      console.error('[OCR] PDF to image conversion failed:', error.message);
      throw new Error(`Failed to convert PDF to image: ${error.message}`);
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

  /**
   * Preprocess image for better vision model results
   * Keep color for vision models (unlike Tesseract which prefers grayscale)
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const processed = await sharp(imageBuffer)
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 }) // Convert to JPEG for smaller base64 size
        .toBuffer();

      return processed;
    } catch (error: any) {
      console.warn(`[OCR] Image preprocessing failed: ${error.message}`);
      return imageBuffer;
    }
  }

  /**
   * Clean vendor name by removing CJK (Chinese/Japanese/Korean) characters
   * Qwen model sometimes confuses Hebrew characters with Chinese
   */
  private cleanVendorName(raw: string): string {
    // Remove CJK characters (common Chinese/Japanese/Korean Unicode ranges)
    // \u3400-\u4DBF: CJK Unified Ideographs Extension A
    // \u4E00-\u9FFF: CJK Unified Ideographs
    // \uF900-\uFAFF: CJK Compatibility Ideographs
    const withoutCJK = raw.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g, '');
    // Collapse extra spaces and trim
    return withoutCJK.replace(/\s+/g, ' ').trim();
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
