import { HfInference } from '@huggingface/inference';
import { z } from 'zod';
import { FormSchema, GenerationOptions } from '../models/form-schema.model';
import { Sanitizer } from '../utils/sanitizer';
import { logger } from '../utils/logger';

/**
 * Hugging Face service for AI-powered form generation using DeepSeek-R1
 */
export class LangChainService {
  private hf: HfInference;
  private readonly model: string = 'deepseek-ai/DeepSeek-R1';
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is required');
    }
    
    this.hf = new HfInference(apiKey);
    logger.info('Hugging Face client initialized', { model: this.model });
  }

  /**
   * Get Zod schema for form validation
   */
  private getFormSchema() {
    return z.object({
      title: z.string(),
      description: z.string().optional(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.enum(['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file', 'password']),
        label: z.string(),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
        required: z.boolean(),
        defaultValue: z.any().optional(),
        validation: z.object({
          minLength: z.number().optional(),
          maxLength: z.number().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional()
        }).optional(),
        options: z.array(z.object({
          value: z.union([z.string(), z.number()]),
          label: z.string()
        })).optional(),
        conditionalDisplay: z.object({
          field: z.string(),
          operator: z.enum(['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan']),
          value: z.any(),
          action: z.enum(['show', 'hide'])
        }).optional()
      })),
      layout: z.enum(['vertical', 'horizontal', 'grid']).optional(),
      theme: z.enum(['light', 'dark']).optional()
    });
  }

  /**
   * Generate form schema from natural language description
   * 
   * @param description - Natural language description of the form
   * @param options - Optional generation options
   * @returns Generated and sanitized form schema
   */
  async generateFormSchema(
    description: string,
    options?: GenerationOptions
  ): Promise<FormSchema> {
    const startTime = Date.now();

    try {
      logger.info('Starting form generation with DeepSeek-R1', { description, options });

      if (!description || description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters');
      }

      const prompt = this.buildPrompt(description, options);

      const response = await this.retryWithBackoff(async () => {
        return await this.hf.chatCompletion({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        });
      });

      const content = response.choices[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsedSchema = JSON.parse(jsonMatch[0]);
      
      const formSchemaValidator = this.getFormSchema();
      const validatedSchema = formSchemaValidator.parse(parsedSchema);

      const sanitizedSchema = Sanitizer.sanitizeObject(validatedSchema);

      const schema: FormSchema = {
        ...sanitizedSchema,
        id: this.generateId(),
        layout: sanitizedSchema.layout || 'vertical',
        theme: sanitizedSchema.theme || 'light',
        metadata: {
          generatedAt: new Date().toISOString(),
          model: this.model,
          cached: false,
          version: '1.0'
        }
      };

      const duration = Date.now() - startTime;
      logger.info('Form generation completed', { 
        formId: schema.id, 
        duration,
        fieldCount: schema.fields.length 
      });

      return schema;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Form generation failed', { 
        description, 
        duration,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to generate form schema: ${error.message}`);
    }
  }

  /**
   * Build prompt for Hugging Face model
   */
  private buildPrompt(
    description: string,
    options?: GenerationOptions
  ): string {
    return `You are an expert form designer. Generate a form schema in JSON format based on the user's description.

User Description: ${description}

Options: ${JSON.stringify(options || {})}

Requirements:
1. Create appropriate field types for the described form
2. Add helpful labels and placeholders
3. Include validation rules where appropriate (minLength, maxLength, pattern, etc.)
4. Make required fields explicit
5. Add help text for complex fields
6. Use conditional logic if fields depend on each other
7. Ensure accessibility (clear labels, help text)
8. For select fields, provide reasonable options
9. Use appropriate field types (email for emails, date for dates, password for passwords, etc.)
10. Keep field names lowercase with underscores (snake_case)

Generate a complete, valid JSON form schema with this structure:
{
  "title": "Form Title",
  "description": "Optional description",
  "fields": [
    {
      "name": "field_name",
      "type": "text|email|password|textarea|select|checkbox|radio|date|file",
      "label": "Field Label",
      "placeholder": "Optional placeholder",
      "required": true|false,
      "validation": {
        "minLength": 3,
        "maxLength": 50,
        "pattern": "regex pattern"
      },
      "options": [{"value": "val", "label": "Label"}]
    }
  ],
  "layout": "vertical|horizontal|grid",
  "theme": "light|dark"
}

Return ONLY the JSON object, no additional text or explanation.`;
  }

  /**
   * Retry function with exponential backoff
   * 
   * @param fn - Function to retry
   * @returns Result of function
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt === this.maxRetries - 1) {
          throw error;
        }

        const delay = this.baseDelay * Math.pow(2, attempt);
        
        logger.warn('LangChain API call failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          delay,
          error: error.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const nonRetryableMessages = [
      'invalid api key',
      'authentication failed',
      'malformed request',
      'invalid model'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Generate unique form ID
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `form_${timestamp}_${random}`;
  }
}
