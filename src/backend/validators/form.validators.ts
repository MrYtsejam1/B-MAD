import Joi from 'joi';

/**
 * Validation schemas for form-related requests
 */

export const generateFormSchema = Joi.object({
  description: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 1000 characters',
      'any.required': 'Description is required'
    }),
  
  options: Joi.object({
    theme: Joi.string().valid('light', 'dark').optional(),
    layout: Joi.string().valid('vertical', 'horizontal', 'grid').optional(),
    includeSubmitButton: Joi.boolean().optional()
  }).optional()
});
