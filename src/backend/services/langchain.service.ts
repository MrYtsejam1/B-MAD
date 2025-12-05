import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { FormSchema, GenerationOptions } from '../models/form-schema.model';
import { Sanitizer } from '../utils/sanitizer';
import { logger } from '../utils/logger';

/**
 * Google Gemini service for AI-powered form generation
 */
export class LangChainService {
  private genAI: GoogleGenerativeAI;
  private readonly model: string = 'gemini-3-pro-preview';
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    logger.info('Google Gemini client initialized', { model: this.model });
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
      logger.info('Starting form generation with Google Gemini', { description, options });

      if (!description || description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters');
      }

      const prompt = this.buildPrompt(description, options);

      const response = await this.retryWithBackoff(async () => {
        const model = this.genAI.getGenerativeModel({ model: this.model });
        const result = await model.generateContent(prompt);
        return result.response;
      });

      const content = response.text() || '';
      
      logger.info('Raw AI response (first 1000 chars)', { content: content.substring(0, 1000) });
      
      let jsonStr = this.extractJSON(content);
      if (!jsonStr) {
        logger.error('Failed to extract JSON from response', { content });
        throw new Error('No valid JSON found in response');
      }
      
      logger.info('Extracted JSON (first 500 chars)', { jsonStr: jsonStr.substring(0, 500) });
      
      const parsedSchema = JSON.parse(jsonStr);
      
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
        
        logger.warn('Gemini API call failed, retrying', {
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
   * Extract JSON object from AI response text
   * Handles various AI response formats including code blocks and extra text
   */
  private extractJSON(content: string): string | null {
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const jsonObjects: string[] = [];
    let braceCount = 0;
    let startIndex = -1;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          const jsonStr = content.substring(startIndex, i + 1);
          jsonObjects.push(jsonStr);
          startIndex = -1;
        }
      }
    }
    
    if (jsonObjects.length === 0) {
      return null;
    }
    
    for (let i = jsonObjects.length - 1; i >= 0; i--) {
      let jsonStr = jsonObjects[i];
      
      jsonStr = jsonStr.replace(/\.\.\./g, '');
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      jsonStr = jsonStr.replace(/\\'/g, "'");
      jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      try {
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.title && parsed.fields && Array.isArray(parsed.fields)) {
          return jsonStr;
        }
      } catch (e) {
        jsonStr = jsonStr.replace(/,\s*}/g, '}');
        jsonStr = jsonStr.replace(/,\s*]/g, ']');
        jsonStr = jsonStr.replace(/([{,]\s*)(\w+):/g, '$1"$2":');
        
        try {
          const parsed = JSON.parse(jsonStr);
          
          if (parsed.title && parsed.fields && Array.isArray(parsed.fields)) {
            return jsonStr;
          }
        } catch (e2) {
          continue;
        }
      }
    }
    
    logger.error('No valid form schema JSON found', { 
      jsonObjectsFound: jsonObjects.length,
      samples: jsonObjects.map(j => j.substring(0, 100))
    });
    return null;
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
