import { Router } from 'express';
import multer from 'multer';
import { OCRController } from '../controllers/ocr.controller';

const router = Router();
const ocrController = new OCRController();

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`));
    }
  },
});

/**
 * POST /api/v1/ocr/invoice
 * Process an uploaded invoice/receipt image with OCR
 * Returns extracted invoice data to populate form fields
 */
router.post(
  '/invoice',
  upload.single('file'),
  (req, res) => ocrController.processInvoice(req, res)
);

export default router;
