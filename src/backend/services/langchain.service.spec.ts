import { LangChainService } from './langchain.service';
import { FormSchema } from '../models/form-schema.model';

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: JSON.stringify({
        title: 'Contact Form',
        description: 'A simple contact form',
        fields: [
          {
            name: 'name',
            type: 'text',
            label: 'Full Name',
            required: true,
            placeholder: 'Enter your name'
          },
          {
            name: 'email',
            type: 'email',
            label: 'Email Address',
            required: true,
            validation: { pattern: 'email' }
          },
          {
            name: 'message',
            type: 'textarea',
            label: 'Message',
            required: true
          }
        ],
        layout: 'vertical',
        theme: 'light'
      })
    })
  }))
}));

jest.mock('@langchain/anthropic', () => ({
  ChatAnthropic: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({
      content: JSON.stringify({
        title: 'Contact Form',
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true }
        ],
        layout: 'vertical',
        theme: 'light'
      })
    })
  }))
}));

jest.mock('langchain/output_parsers', () => ({
  StructuredOutputParser: {
    fromZodSchema: jest.fn().mockReturnValue({
      getFormatInstructions: jest.fn().mockReturnValue('Format instructions'),
      parse: jest.fn().mockImplementation((content) => JSON.parse(content))
    })
  }
}));

jest.mock('@langchain/core/prompts', () => ({
  PromptTemplate: {
    fromTemplate: jest.fn().mockReturnValue({
      format: jest.fn().mockResolvedValue('Formatted prompt')
    })
  }
}));

describe('LangChainService', () => {
  let service: LangChainService;

  beforeEach(() => {
    process.env.LANGCHAIN_PROVIDER = 'openai';
    process.env.LANGCHAIN_MODEL = 'gpt-4';
    process.env.LANGCHAIN_TEMPERATURE = '0.3';
    process.env.OPENAI_API_KEY = 'test-key';

    service = new LangChainService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFormSchema', () => {
    it('should generate form schema from description', async () => {
      const description = 'Create a contact form with name, email, and message';
      
      const schema = await service.generateFormSchema(description);

      expect(schema).toBeDefined();
      expect(schema.id).toMatch(/^form_\d+_[a-z0-9]+$/);
      expect(schema.title).toBeDefined();
      expect(schema.fields).toBeInstanceOf(Array);
      expect(schema.fields.length).toBeGreaterThan(0);
      expect(schema.layout).toMatch(/^(vertical|horizontal|grid)$/);
      expect(schema.theme).toMatch(/^(light|dark)$/);
      expect(schema.metadata).toBeDefined();
      expect(schema.metadata.generatedAt).toBeDefined();
      expect(schema.metadata.cached).toBe(false);
    });

    it('should throw error for invalid description', async () => {
      await expect(
        service.generateFormSchema('')
      ).rejects.toThrow('Description must be at least 10 characters');

      await expect(
        service.generateFormSchema('short')
      ).rejects.toThrow('Description must be at least 10 characters');
    });

    it('should sanitize LLM output', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: JSON.stringify({
          title: 'Form <script>alert("XSS")</script>',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: '<b>Name</b>',
              required: true
            }
          ],
          layout: 'vertical',
          theme: 'light'
        })
      });
      
      (service as any).llm.invoke = mockInvoke;
      
      const description = 'Contact form';
      const schema = await service.generateFormSchema(description);

      expect(schema.title).not.toContain('<script>');
      expect(schema.title).toBe('Form alert("XSS")');
      expect(schema.fields[0].label).not.toContain('<b>');
      expect(schema.fields[0].label).toBe('Name');
    });

    it('should support generation options', async () => {
      const description = 'Contact form';
      const options = {
        theme: 'dark' as const,
        layout: 'horizontal' as const
      };

      const schema = await service.generateFormSchema(description, options);

      expect(schema).toBeDefined();
    });

    it('should handle LangChain API timeout', async () => {
      const mockInvoke = jest.fn().mockRejectedValue(new Error('Request timeout'));
      (service as any).llm.invoke = mockInvoke;

      await expect(
        service.generateFormSchema('Contact form')
      ).rejects.toThrow('Failed to generate form schema');
    });

    it('should retry on transient errors', async () => {
      let attempts = 0;
      const mockInvoke = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return {
          content: JSON.stringify({
            title: 'Contact Form',
            fields: [{ name: 'name', type: 'text', label: 'Name', required: true }],
            layout: 'vertical',
            theme: 'light'
          })
        };
      });
      
      (service as any).llm.invoke = mockInvoke;

      const schema = await service.generateFormSchema('Contact form');
      
      expect(attempts).toBe(3);
      expect(schema).toBeDefined();
    });

    it('should not retry on authentication errors', async () => {
      const mockInvoke = jest.fn().mockRejectedValue(new Error('Invalid API key'));
      (service as any).llm.invoke = mockInvoke;

      await expect(
        service.generateFormSchema('Contact form')
      ).rejects.toThrow('Invalid API key');
      
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should generate schema with all field types', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: JSON.stringify({
          title: 'Comprehensive Form',
          fields: [
            { name: 'name', type: 'text', label: 'Name', required: true },
            { name: 'email', type: 'email', label: 'Email', required: true },
            { name: 'bio', type: 'textarea', label: 'Bio', required: false },
            { name: 'country', type: 'select', label: 'Country', required: true, options: [
              { value: 'us', label: 'United States' },
              { value: 'uk', label: 'United Kingdom' }
            ]},
            { name: 'agree', type: 'checkbox', label: 'I agree', required: true },
            { name: 'gender', type: 'radio', label: 'Gender', required: false, options: [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' }
            ]},
            { name: 'birthdate', type: 'date', label: 'Birth Date', required: false },
            { name: 'resume', type: 'file', label: 'Resume', required: false }
          ],
          layout: 'vertical',
          theme: 'light'
        })
      });
      
      (service as any).llm.invoke = mockInvoke;
      
      const description = 'Form with all field types';
      const schema = await service.generateFormSchema(description);

      const fieldTypes = schema.fields.map(f => f.type);
      expect(fieldTypes).toContain('text');
      expect(fieldTypes).toContain('email');
      expect(fieldTypes).toContain('textarea');
      expect(fieldTypes).toContain('select');
      expect(fieldTypes).toContain('checkbox');
      expect(fieldTypes).toContain('radio');
      expect(fieldTypes).toContain('date');
      expect(fieldTypes).toContain('file');
    });

    it('should include validation rules', async () => {
      const mockInvoke = jest.fn().mockResolvedValue({
        content: JSON.stringify({
          title: 'Form with Validation',
          fields: [
            {
              name: 'email',
              type: 'email',
              label: 'Email',
              required: true,
              validation: {
                pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
              }
            },
            {
              name: 'password',
              type: 'text',
              label: 'Password',
              required: true,
              validation: {
                minLength: 8,
                maxLength: 128
              }
            }
          ],
          layout: 'vertical',
          theme: 'light'
        })
      });
      
      (service as any).llm.invoke = mockInvoke;
      
      const description = 'Form with email validation and password requirements';
      const schema = await service.generateFormSchema(description);

      const emailField = schema.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField?.validation).toBeDefined();
      expect(emailField?.validation?.pattern).toBeDefined();

      const passwordField = schema.fields.find(f => f.name === 'password');
      expect(passwordField?.validation?.minLength).toBe(8);
      expect(passwordField?.validation?.maxLength).toBe(128);
    });

    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await service.generateFormSchema('Simple contact form');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs', () => {
      const id1 = (service as any).generateId();
      const id2 = (service as any).generateId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^form_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^form_\d+_[a-z0-9]+$/);
    });
  });

  describe('isNonRetryableError', () => {
    it('should identify non-retryable errors', () => {
      const service = new LangChainService();
      
      expect((service as any).isNonRetryableError(new Error('Invalid API key'))).toBe(true);
      expect((service as any).isNonRetryableError(new Error('Authentication failed'))).toBe(true);
      expect((service as any).isNonRetryableError(new Error('Malformed request'))).toBe(true);
      expect((service as any).isNonRetryableError(new Error('Invalid model'))).toBe(true);
    });

    it('should identify retryable errors', () => {
      const service = new LangChainService();
      
      expect((service as any).isNonRetryableError(new Error('Network error'))).toBe(false);
      expect((service as any).isNonRetryableError(new Error('Timeout'))).toBe(false);
      expect((service as any).isNonRetryableError(new Error('Rate limit exceeded'))).toBe(false);
    });
  });
});
