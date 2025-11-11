import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { FormSchema, GenerationOptions } from '../models/form-schema.model';
import { Sanitizer } from '../utils/sanitizer';
import { logger } from '../utils/logger';
import { langChainConfig } from '../config/langchain.config';

/**
 * LangChain service for AI-powered form generation
 */
export class LangChainService {
  private llm!: ChatOpenAI | ChatAnthropic;
  private parser!: StructuredOutputParser<any>;
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly timeout: number;

  constructor() {
    this.maxRetries = langChainConfig.maxRetries;
    this.baseDelay = langChainConfig.baseDelay;
    this.timeout = langChainConfig.timeout;
    
    this.initializeLLM();
    this.initializeParser();
  }

  /**
   * Initialize LLM provider based on configuration
   */
  private initializeLLM(): void {
    const { provider, model, temperature, maxTokens } = langChainConfig;

    if (provider === 'anthropic') {
      this.llm = new ChatAnthropic({
        modelName: model,
        temperature,
        maxTokens: maxTokens,
        timeout: this.timeout,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY
      } as any);
    } else {
      this.llm = new ChatOpenAI({
        modelName: model,
        temperature,
        maxTokens,
        timeout: this.timeout,
        openAIApiKey: process.env.OPENAI_API_KEY
      });
    }

    logger.info('LangChain LLM initialized', { provider, model });
  }

  /**
   * Initialize structured output parser with Zod schema
   */
  private initializeParser(): void {
    const formSchemaZod = z.object({
      title: z.string(),
      description: z.string().optional(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.enum(['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file']),
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
      layout: z.enum(['vertical', 'horizontal', 'grid']),
      theme: z.enum(['light', 'dark'])
    });

    this.parser = StructuredOutputParser.fromZodSchema(formSchemaZod);
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
      logger.info('Starting form generation', { description, options });

      if (!description || description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters');
      }

      const prompt = await this.buildPrompt(description, options);

      const response = await this.retryWithBackoff(async () => {
        return await this.llm.invoke(prompt);
      });

      const parsedSchema = await this.parser.parse(response.content as string);

      const sanitizedSchema = Sanitizer.sanitizeObject(parsedSchema);

      const schema: FormSchema = {
        ...sanitizedSchema,
        id: this.generateId(),
        metadata: {
          generatedAt: new Date().toISOString(),
          model: langChainConfig.model,
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
   * Build prompt template for LLM
   */
  private async buildPrompt(
    description: string,
    options?: GenerationOptions
  ): Promise<string> {
    const formatInstructions = this.parser.getFormatInstructions();

    const template = PromptTemplate.fromTemplate(`
You are an expert form designer. Generate a form schema based on the user's description.

User Description: {description}

Options: {options}

Requirements:
1. Create appropriate field types for the described form
2. Add helpful labels and placeholders
3. Include validation rules where appropriate (minLength, maxLength, pattern, etc.)
4. Make required fields explicit
5. Add help text for complex fields
6. Use conditional logic if fields depend on each other
7. Ensure accessibility (clear labels, help text)
8. For select fields, provide reasonable options
9. Use appropriate field types (email for emails, date for dates, etc.)
10. Keep field names lowercase with underscores (snake_case)

{format_instructions}

Generate a complete, valid form schema:
    `);

    return await template.format({
      description,
      options: JSON.stringify(options || {}),
      format_instructions: formatInstructions
    });
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
