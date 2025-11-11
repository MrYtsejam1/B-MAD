import { ValidationService } from './validation.service';
import { FormField } from '../types/form-schema.types';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateField', () => {
    it('should validate required field', () => {
      const field: FormField = {
        name: 'email',
        type: 'email',
        label: 'Email',
        required: true
      };

      const result = service.validateField(field, '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should pass validation for optional empty field', () => {
      const field: FormField = {
        name: 'phone',
        type: 'text',
        label: 'Phone',
        required: false
      };

      const result = service.validateField(field, '');
      expect(result.valid).toBe(true);
    });

    it('should validate email format', () => {
      const field: FormField = {
        name: 'email',
        type: 'email',
        label: 'Email',
        required: true
      };

      const invalidResult = service.validateField(field, 'invalid-email');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('valid email');

      const validResult = service.validateField(field, 'test@example.com');
      expect(validResult.valid).toBe(true);
    });

    it('should validate date format', () => {
      const field: FormField = {
        name: 'birthdate',
        type: 'date',
        label: 'Birth Date',
        required: true
      };

      const invalidResult = service.validateField(field, 'invalid-date');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('valid date');

      const validResult = service.validateField(field, '2000-01-01');
      expect(validResult.valid).toBe(true);
    });

    it('should validate minLength', () => {
      const field: FormField = {
        name: 'password',
        type: 'text',
        label: 'Password',
        required: true,
        validation: {
          minLength: 8
        }
      };

      const invalidResult = service.validateField(field, 'short');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('at least 8 characters');

      const validResult = service.validateField(field, 'longpassword');
      expect(validResult.valid).toBe(true);
    });

    it('should validate maxLength', () => {
      const field: FormField = {
        name: 'username',
        type: 'text',
        label: 'Username',
        required: true,
        validation: {
          maxLength: 20
        }
      };

      const invalidResult = service.validateField(field, 'a'.repeat(25));
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('not exceed 20 characters');

      const validResult = service.validateField(field, 'validusername');
      expect(validResult.valid).toBe(true);
    });

    it('should validate min value', () => {
      const field: FormField = {
        name: 'age',
        type: 'text',
        label: 'Age',
        required: true,
        validation: {
          min: 18
        }
      };

      const invalidResult = service.validateField(field, '15');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('at least 18');

      const validResult = service.validateField(field, '25');
      expect(validResult.valid).toBe(true);
    });

    it('should validate max value', () => {
      const field: FormField = {
        name: 'age',
        type: 'text',
        label: 'Age',
        required: true,
        validation: {
          max: 100
        }
      };

      const invalidResult = service.validateField(field, '150');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('not exceed 100');

      const validResult = service.validateField(field, '50');
      expect(validResult.valid).toBe(true);
    });

    it('should validate pattern', () => {
      const field: FormField = {
        name: 'zipcode',
        type: 'text',
        label: 'Zip Code',
        required: true,
        validation: {
          pattern: '^\\d{5}$'
        }
      };

      const invalidResult = service.validateField(field, '123');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('format is invalid');

      const validResult = service.validateField(field, '12345');
      expect(validResult.valid).toBe(true);
    });

    it('should validate checkbox', () => {
      const field: FormField = {
        name: 'terms',
        type: 'checkbox',
        label: 'Accept Terms',
        required: true
      };

      const invalidResult = service.validateField(field, false);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('must be checked');

      const validResult = service.validateField(field, true);
      expect(validResult.valid).toBe(true);
    });

    it('should validate select options', () => {
      const field: FormField = {
        name: 'country',
        type: 'select',
        label: 'Country',
        required: true,
        options: [
          { value: 'us', label: 'United States' },
          { value: 'ca', label: 'Canada' }
        ]
      };

      const invalidResult = service.validateField(field, 'invalid');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('available options');

      const validResult = service.validateField(field, 'us');
      expect(validResult.valid).toBe(true);
    });
  });

  describe('validateForm', () => {
    it('should validate entire form', () => {
      const fields: FormField[] = [
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
          required: true,
          validation: { min: 18 }
        }
      ];

      const invalidData = {
        email: 'invalid-email',
        age: '15'
      };

      const result = service.validateForm(fields, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it('should pass validation for valid form', () => {
      const fields: FormField[] = [
        {
          name: 'email',
          type: 'email',
          label: 'Email',
          required: true
        },
        {
          name: 'message',
          type: 'textarea',
          label: 'Message',
          required: false
        }
      ];

      const validData = {
        email: 'test@example.com',
        message: 'Hello'
      };

      const result = service.validateForm(fields, validData);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('helper methods', () => {
    it('should get first error field', () => {
      const errors = [
        { field: 'email', code: 'INVALID_EMAIL', message: 'Invalid email' },
        { field: 'age', code: 'MIN_VALUE', message: 'Too young' }
      ];

      const firstField = service.getFirstErrorField(errors);
      expect(firstField).toBe('email');
    });

    it('should get field error', () => {
      const errors = [
        { field: 'email', code: 'INVALID_EMAIL', message: 'Invalid email' },
        { field: 'age', code: 'MIN_VALUE', message: 'Too young' }
      ];

      const error = service.getFieldError(errors, 'age');
      expect(error).toBe('Too young');
    });

    it('should check if field has error', () => {
      const errors = [
        { field: 'email', code: 'INVALID_EMAIL', message: 'Invalid email' }
      ];

      expect(service.hasFieldError(errors, 'email')).toBe(true);
      expect(service.hasFieldError(errors, 'age')).toBe(false);
    });
  });
});
