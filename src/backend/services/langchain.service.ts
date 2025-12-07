import { InferenceClient } from '@huggingface/inference';
import { z } from 'zod';
import { FormSchema, GenerationOptions } from '../models/form-schema.model';
import { Sanitizer } from '../utils/sanitizer';
import { logger } from '../utils/logger';
import { EmulatedAIService } from './emulated-ai.service';

/**
 * Hugging Face Inference service for AI-powered form generation
 */
export class LangChainService {
  private hf: InferenceClient | null = null;
  private readonly availableModels: string[] = [
    'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai',
    'agentica-org/DeepCoder-14B-Preview:featherless-ai'
  ];
  private readonly defaultModel: string = 'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai';
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000;
  private emulatedAI: EmulatedAIService;

  constructor() {
    const token = process.env.HF_TOKEN;
    this.emulatedAI = new EmulatedAIService();
    
    if (token && token !== 'demo_key_not_configured') {
      this.hf = new InferenceClient(token);
      logger.info('Hugging Face Inference client initialized', { 
        defaultModel: this.defaultModel,
        availableModels: this.availableModels 
      });
    } else {
      logger.info('No HF_TOKEN configured, will use emulated AI');
    }
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
      if (!description || description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters');
      }

      if (!this.hf) {
        logger.info('Using emulated AI (no HF_TOKEN configured)');
        return this.emulatedAI.generateFormSchema(description);
      }

      const selectedModel = options?.model || this.defaultModel;
      
      if (!this.availableModels.includes(selectedModel)) {
        logger.warn('Invalid model selected, using default', { 
          selectedModel, 
          defaultModel: this.defaultModel 
        });
      }

      const model = this.availableModels.includes(selectedModel) ? selectedModel : this.defaultModel;

      logger.info('Starting form generation with Hugging Face', { description, options, model });

      const prompt = this.buildPrompt(description, options);

      try {
        const response = await this.retryWithBackoff(async () => {
          return await this.hf!.chatCompletion({
            model: model,
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
        return await this.processAIResponse(content, model, startTime);
        
      } catch (error: any) {
        logger.warn('Hugging Face model failed, falling back to emulated AI', { 
          model: model, 
          error: error.message 
        });
        return this.emulatedAI.generateFormSchema(description);
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Form generation failed completely', { 
        description, 
        duration,
        error: error.message,
        stack: error.stack
      });
      
      logger.info('Using emulated AI as last resort');
      return this.emulatedAI.generateFormSchema(description);
    }
  }

  private async processAIResponse(content: string, modelName: string, startTime: number): Promise<FormSchema> {
    try {
      logger.info('Raw AI response (first 1000 chars)', { content: content.substring(0, 1000) });
      
      const jsonStr = this.extractJSON(content);
      if (!jsonStr) {
        logger.error('Failed to extract JSON from response', { content });
        throw new Error('No valid JSON found in response');
      }
      
      logger.info('Extracted JSON (first 500 chars)', { jsonStr: jsonStr.substring(0, 500) });
      
      const parsedSchema = JSON.parse(jsonStr);
      
      // Normalize the schema to handle unsupported field types and missing required fields
      const normalizedSchema = this.normalizeSchema(parsedSchema);
      
      const formSchemaValidator = this.getFormSchema();
      const validatedSchema = formSchemaValidator.parse(normalizedSchema);

      const sanitizedSchema = Sanitizer.sanitizeObject(validatedSchema);

      const schema: FormSchema = {
        ...sanitizedSchema,
        id: this.generateId(),
        layout: sanitizedSchema.layout || 'vertical',
        theme: sanitizedSchema.theme || 'light',
        metadata: {
          generatedAt: new Date().toISOString(),
          model: modelName,
          cached: false,
          version: '1.0'
        }
      };

      const duration = Date.now() - startTime;
      logger.info('Form generation completed', { 
        formId: schema.id, 
        model: modelName,
        duration,
        fieldCount: schema.fields.length 
      });

      return schema;
    } catch (error: any) {
      throw new Error(`Failed to process AI response: ${error.message}`);
    }
  }

  /**
   * Normalize schema to handle unsupported field types and missing required fields
   * This provides a defensive layer against AI models generating invalid field types
   */
  private normalizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
    const allowedTypes = ['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file', 'password'] as const;
    
    if (!schema.fields || !Array.isArray(schema.fields)) {
      return schema;
    }
    
    const normalizedFields = schema.fields.map((field: Record<string, unknown>, index: number) => {
      const normalized = { ...field };
      
      // Normalize type: coerce unsupported types to 'text'
      if (typeof normalized.type !== 'string' || !allowedTypes.includes(normalized.type as typeof allowedTypes[number])) {
        logger.warn('Unsupported field type from AI, coercing to text', {
          index,
          fieldName: normalized.name,
          originalType: normalized.type
        });
        normalized.type = 'text';
      }
      
      // Normalize required: ensure it's a boolean, default to false
      if (typeof normalized.required !== 'boolean') {
        normalized.required = false;
      }
      
      return normalized;
    });
    
    return {
      ...schema,
      fields: normalizedFields
    };
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
4. Make required fields explicit (always include "required": true or "required": false for every field)
5. Add help text for complex fields
6. Use conditional logic if fields depend on each other
7. Ensure accessibility (clear labels, help text)
8. For select fields, provide reasonable options
9. IMPORTANT: Use ONLY these exact field types: text, email, password, textarea, select, checkbox, radio, date, file. Do NOT use any other types like number, time, tel, url, range, etc. For time-of-day fields, use "text" type with a placeholder like "HH:MM". For phone numbers, use "text" type.
10. Keep field names lowercase with underscores (snake_case)
11. VERY IMPORTANT - ROLE DISTINCTION: Distinguish clearly between the person filling out the form ("the user") and other people they mention:
    a. The "user" is the person speaking in the description (using "I", "me", "my"). Assume the form is primarily for the user unless they explicitly say they are booking on behalf of someone else.
    b. Only pre-fill personal fields for the user (like first_name, last_name, email, phone) when it is CLEAR that the value refers to the user themselves. If a name clearly belongs to someone else (e.g., "my coworker Yosi Yehuda", "my friend John", "my manager Dana"), do NOT use that as the user's own name.
    c. When other people are mentioned (companions, coworkers, managers, approvers), create SEPARATE fields with clear prefixes, for example: companion_name, companion_email, manager_name, manager_email, approver_name. Pre-fill those fields with the mentioned values.
    d. If there is ANY ambiguity about whether a value belongs to the user or someone else, do NOT pre-fill the user's personal fields. Leave them empty and let the user fill them in.
12. VERY IMPORTANT - DATA EXTRACTION: When the user's description contains concrete values for non-personal fields (like dates, cities, hotel names, flight numbers, times, amounts), you MUST set those values in the field's "defaultValue" property. Trip details can always be pre-filled. Apply the role logic from requirement 11 for personal information.

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
      "defaultValue": "Pre-filled value extracted from user description (if available)",
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

Field naming conventions:
- User's own fields: first_name, last_name, email, phone (leave defaultValue empty unless user explicitly states their own name)
- Companion fields: companion_name, companion_email, companion_phone
- Manager fields: manager_name, manager_email
- Trip details: departure_city, destination_city, departure_date, return_date, flight_number, hotel_name (always pre-fill these)

Return ONLY the JSON object, no additional text or explanation. Do not include your reasoning or thinking process in the response.`;
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
        
        logger.warn('Hugging Face API call failed, retrying', {
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
   * Strip JavaScript-style comments from JSON string while preserving comments inside string values
   * This handles cases where AI models include comments like "// Today's date" in JSON output
   */
  private stripJsonComments(input: string): string {
    let result = '';
    let inString = false;
    let stringChar: string | null = null;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let prevChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const nextChar = i + 1 < input.length ? input[i + 1] : '';

      // Handle single-line comments
      if (inSingleLineComment) {
        if (char === '\n' || char === '\r') {
          inSingleLineComment = false;
          result += char;
        }
        continue;
      }

      // Handle multi-line comments
      if (inMultiLineComment) {
        if (char === '*' && nextChar === '/') {
          inMultiLineComment = false;
          i++; // skip '/'
        }
        continue;
      }

      // Detect start of single-line comment (only outside strings)
      if (!inString && char === '/' && nextChar === '/') {
        inSingleLineComment = true;
        i++; // skip second '/'
        continue;
      }

      // Detect start of multi-line comment (only outside strings)
      if (!inString && char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        i++; // skip '*'
        continue;
      }

      // Detect start of string
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        result += char;
        prevChar = char;
        continue;
      }

      // Detect end of string (handle escaped quotes)
      if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = null;
        result += char;
        prevChar = char;
        continue;
      }

      result += char;
      prevChar = char;
    }

    return result;
  }

  /**
   * Extract JSON object from AI response text
   * Handles various AI response formats including code blocks, thinking blocks, and extra text
   */
  private extractJSON(content: string): string | null {
    // Remove chain-of-thought / thinking blocks that may contain brace-like patterns
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const jsonObjects: string[] = [];
    let braceCount = 0;
    let startIndex = -1;
    let inString = false;
    let stringChar: string | null = null;
    let escape = false;
    
    // String-aware brace counting to handle braces inside strings (like regex patterns)
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      // Handle string context
      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
        continue;
      }
      
      // Detect start of string
      if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        continue;
      }
      
      // Count braces only outside of strings
      if (char === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (char === '}') {
        if (braceCount > 0) {
          braceCount--;
          if (braceCount === 0 && startIndex !== -1) {
            const jsonStr = content.substring(startIndex, i + 1);
            jsonObjects.push(jsonStr);
            startIndex = -1;
          }
        }
      }
    }
    
    if (jsonObjects.length === 0) {
      return null;
    }
    
    // Sort by length descending - prefer larger objects (full schema) over fragments
    const candidates = [...jsonObjects].sort((a, b) => b.length - a.length);
    
    for (const candidate of candidates) {
      let jsonStr = candidate;
      
      // Strip JavaScript-style comments (// and /* */) that AI models sometimes include
      jsonStr = this.stripJsonComments(jsonStr);
      
      // Strip JavaScript-style comments (// and /* */) that AI models sometimes include
      jsonStr = this.stripJsonComments(jsonStr);
      
      jsonStr = jsonStr.replace(/\.\.\./g, '');
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      jsonStr = jsonStr.replace(/\\'/g, "'");
      // eslint-disable-next-line no-control-regex
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
