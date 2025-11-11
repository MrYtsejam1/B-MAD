import { Request, Response } from 'express';
import { LangChainService } from '../services/langchain.service';
import { GenerationOptions } from '../models/form-schema.model';
import { logger } from '../utils/logger';

/**
 * Form controller handling form-related API endpoints
 */
export class FormController {
  private langChainService: LangChainService;

  constructor() {
    this.langChainService = new LangChainService();
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

      logger.info('Form generation requested', {
        userId,
        descriptionLength: description.length,
        options
      });

      const schema = await this.langChainService.generateFormSchema(
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
