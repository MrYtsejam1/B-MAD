import { Request, Response } from 'express';
import { OCRService } from '../services/ocr.service';

export class OCRController {
  private ocrService: OCRService;

  constructor() {
    this.ocrService = new OCRService();
  }

  /**
   * Process an uploaded invoice/receipt image with OCR
   * Returns extracted data that can be used to populate form fields
   */
  async processInvoice(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      
      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded. Please upload an invoice image or PDF.',
        });
        return;
      }

      console.log(`[OCR] Processing invoice file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);

      const result = await this.ocrService.processReceipt({
        imageBuffer: file.buffer,
        mimeType: file.mimetype,
        filename: file.originalname,
      });

      if (!result.success) {
        res.status(422).json({
          success: false,
          error: result.errors?.[0] || 'OCR processing failed',
          errors: result.errors,
        });
        return;
      }

      // Map OCR result to form field names matching the MCP schema
      const enrichedFields: Record<string, string | undefined> = {};
      
      if (result.invoice) {
        // Map to MCP invoice schema field names
        if (result.invoice.vendor?.value) {
          enrichedFields.invoiceDetails = result.invoice.vendor.value;
        }
        if (result.invoice.date?.value) {
          enrichedFields.invoiceDate = result.invoice.date.value;
        }
        if (result.invoice.amount?.value) {
          // Include amount in invoice details if we have it
          const currency = result.invoice.currency?.value || '';
          const amountStr = `${result.invoice.amount.value} ${currency}`.trim();
          if (enrichedFields.invoiceDetails) {
            enrichedFields.invoiceDetails += ` - ${amountStr}`;
          } else {
            enrichedFields.invoiceDetails = amountStr;
          }
        }
        // Try to detect expense type from vendor or description
        if (result.invoice.vendor?.value) {
          const vendorLower = result.invoice.vendor.value.toLowerCase();
          if (vendorLower.includes('hotel') || vendorLower.includes('מלון')) {
            enrichedFields.expenseType = 'hotel';
          } else if (vendorLower.includes('restaurant') || vendorLower.includes('cafe') || vendorLower.includes('מסעדה')) {
            enrichedFields.expenseType = 'food';
          } else if (vendorLower.includes('parking') || vendorLower.includes('חניה')) {
            enrichedFields.expenseType = 'parking';
          } else if (vendorLower.includes('flight') || vendorLower.includes('airline') || vendorLower.includes('טיסה')) {
            enrichedFields.expenseType = 'flight';
          }
        }
      }

      console.log(`[OCR] Extracted fields:`, enrichedFields);

      res.json({
        success: true,
        enrichedFields,
        rawText: result.rawText,
        confidence: result.confidence,
        processingTime: result.processingTime,
        warnings: result.warnings,
      });
    } catch (error: any) {
      console.error('[OCR] Error processing invoice:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error during OCR processing',
      });
    }
  }
}
