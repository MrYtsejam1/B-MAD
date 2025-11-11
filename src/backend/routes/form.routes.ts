import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FormController } from '../controllers/form.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { generateFormSchema } from '../validators/form.validators';

const router = Router();
const formController = new FormController();

const generateFormLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many form generation requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/v1/forms/generate
 * Generate form schema from natural language description
 * 
 * Authentication: Required (JWT)
 * Rate Limit: 10 requests per minute
 */
router.post(
  '/generate',
  authenticate,
  generateFormLimiter,
  validate(generateFormSchema),
  (req, res) => formController.generateForm(req, res)
);

export default router;
