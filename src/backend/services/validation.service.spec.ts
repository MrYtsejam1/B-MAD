import { ValidationService } from './validation.service';
import { FormSchema } from '../models/form-schema.model';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateSchema', () => {
    it('should validate valid schema', () => {
      const schema: Partial<FormSchema> = {
        title: 'Contact Form',
        fields: [
          {
            name: 'email',
            type: 'email',
            label: 'Email',
            required: true
          }
        ],
        layout: 'vertical',
        theme: 'light'
      };

      const result = service.validateSchema(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject schema without title', () => {
      const schema: Partial<FormSchema> = {
        fields: [],
        layout: 'vertical',
        theme: 'light'
      };

      const result = service.validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    it('should reject schema with duplicate field names', () => {
      const schema: Partial<FormSchema> = {
        title: 'Form',
        fields: [
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'email', type: 'text', label: 'Email 2', required: false }
        ],
        layout: 'vertical',
        theme: 'light'
      };

      const result = service.validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'DUPLICATE_FIELD'
        })
      );
    });

    it('should reject schema with invalid field type', () => {
      const schema: Partial<FormSchema> = {
        title: 'Form',
        fields: [
          { name: 'field1', type: 'invalid' as any, label: 'Field', required: true }
        ],
        layout: 'vertical',
        theme: 'light'
      };

      const result = service.validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_TYPE'
        })
      );
    });

    it('should reject select field without options', () => {
      const schema: Partial<FormSchema> = {
        title: 'Form',
        fields: [
          { name: 'country', type: 'select', label: 'Country', required: true }
        ],
        layout: 'vertical',
        theme: 'light'
      };

      const result = service.validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'fields[0].options',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    it('should reject invalid validation rules', () => {
      const schema: Partial<FormSchema> = {
        title: 'Form',
        fields: [
          {
            name: 'password',
            type: 'text',
            label: 'Password',
            required: true,
            validation: {
              minLength: 10,
              maxLength: 5
            }
          }
        ],
        layout: 'vertical',
        theme: 'light'
      };

      const result = service.validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_RANGE'
        })
      );
    });

    it('should detect circular dependencies', () => {
      const schema: Partial<FormSchema> = {
        title: 'Form',
        fields: [
          {
            name: 'field1',
            type: 'text',
            label: 'Field 1',
            required: false,
            conditionalDisplay: {
              field: 'field1',
              operator: 'equals',
              value: 'test',
              action: 'show'
            }
          }
        ],
        layout: 'vertical',
        theme: 'light'
      };

      const result = service.validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'CIRCULAR_DEPENDENCY'
        })
      );
    });
  });

  describe('validateFormData', () => {
    const schema: FormSchema = {
      id: 'form1',
      title: 'Test Form',
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'Email',
          required: true
        },
        {
          name: 'age',
          type: 'text',
          label: 'Age',
          required: false,
          validation: {
            min: 18,
            max: 100
          }
        }
      ],
      layout: 'vertical',
      theme: 'light',
      metadata: {
        generatedAt: '2025-11-11T18:00:00.000Z',
        model: 'gpt-4',
        cached: false,
        version: '1.0'
      }
    };

    it('should validate valid form data', () => {
      const data = {
        email: 'test@example.com',
        age: '25'
      };

      const result = service.validateFormData(data, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required field', () => {
      const data = {
        age: '25'
      };

      const result = service.validateFormData(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email'
      };

      const result = service.validateFormData(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          code: 'INVALID_EMAIL'
        })
      );
    });

    it('should reject value below min', () => {
      const data = {
        email: 'test@example.com',
        age: '15'
      };

      const result = service.validateFormData(data, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'age',
          code: 'MIN_VALUE'
        })
      );
    });
  });
});
