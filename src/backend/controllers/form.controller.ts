import { Request, Response } from 'express';
import { LangChainService } from '../services/langchain.service';
import { GenerationOptions } from '../models/form-schema.model';
import { logger } from '../utils/logger';

/**
 * Form controller handling form-related API endpoints
 */
export class FormController {
  constructor() {
  }

  /**
   * Generate form schema from natural language description
   * POST /api/v1/forms/generate
   */
  async generateForm(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const { description, options } = req.body;
      const userId = req.user?.userId;
      const forceRealAI = req.headers['x-force-real-ai'] === 'true';

      const hasGroqKey = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'demo_key_not_configured';
      
      if (!hasGroqKey && !forceRealAI) {
        logger.info('Using mock response for demo (no API keys configured)');
        
        const mockSchema = {
          id: 'demo-form-' + Date.now(),
          title: description.length > 50 ? description.substring(0, 50) + '...' : description,
          description: 'This is a demo form generated without AI. Configure Groq API key for real AI-powered generation.',
          fields: [
            {
              id: 'username',
              name: 'username',
              type: 'text',
              label: 'Username',
              placeholder: 'Enter your username',
              required: true,
              validation: {
                minLength: 3,
                maxLength: 20,
                pattern: '^[a-zA-Z0-9_]+$'
              }
            },
            {
              id: 'email',
              name: 'email',
              type: 'email',
              label: 'Email Address',
              placeholder: 'user@example.com',
              required: true,
              validation: {
                pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
              }
            },
            {
              id: 'password',
              name: 'password',
              type: 'password',
              label: 'Password',
              placeholder: 'Enter a secure password',
              required: true,
              validation: {
                minLength: 8,
                pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
              }
            },
            {
              id: 'confirmPassword',
              name: 'confirmPassword',
              type: 'password',
              label: 'Confirm Password',
              placeholder: 'Re-enter your password',
              required: true,
              validation: {
                minLength: 8
              }
            },
            {
              id: 'agreeToTerms',
              name: 'agreeToTerms',
              type: 'checkbox',
              label: 'I agree to the terms and conditions',
              required: true
            }
          ],
          metadata: {
            createdAt: new Date().toISOString(),
            version: '1.0',
            generatedBy: 'B-MAD Demo (Mock Response)',
            processingTime: Math.floor(Math.random() * 500) + 500
          }
        };

        const duration = Date.now() - startTime;
        logger.info('Mock form schema generated', {
          userId,
          duration,
          fieldCount: mockSchema.fields.length
        });

        res.status(200).json({
          success: true,
          schema: mockSchema,
          metadata: {
            processingTime: duration,
            model: 'mock-demo',
            tokensUsed: 0,
            cached: false,
            demo: true
          }
        });
        return;
      }

      if (forceRealAI && !hasGroqKey) {
        logger.warn('Real AI generation requested but no Groq API key configured');
        res.status(503).json({
          error: {
            code: 'AI_NOT_CONFIGURED',
            message: 'Real AI generation requires Groq API key to be configured.',
            details: 'Please set GROQ_API_KEY environment variable in Render dashboard. Get your free API key at https://console.groq.com/keys'
          }
        });
        return;
      }

      logger.info('Form generation requested', {
        userId,
        descriptionLength: description.length,
        options
      });

      const langChainService = new LangChainService();
      const schema = await langChainService.generateFormSchema(
        description,
        options as GenerationOptions
      );

      const duration = Date.now() - startTime;

      logger.info('Form generation successful', {
        userId,
        formId: schema.id,
        duration,
        fieldCount: schema.fields.length
      });

      res.status(200).json({
        id: schema.id,
        schema: {
          title: schema.title,
          description: schema.description,
          fields: schema.fields,
          layout: schema.layout,
          theme: schema.theme
        },
        metadata: schema.metadata
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Form generation failed', {
        userId: req.user?.userId,
        duration,
        error: error.message,
        stack: error.stack
      });

      if (error.message.includes('Description must be')) {
        res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: error.message
          }
        });
        return;
      }

      if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
        res.status(504).json({
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: 'Form generation timed out. Please try again.'
          }
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'GENERATION_ERROR',
          message: 'Failed to generate form schema',
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
        }
      });
    }
  }
}
