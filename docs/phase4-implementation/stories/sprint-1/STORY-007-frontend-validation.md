# Story: STORY-007 - Frontend Validation Service

## Story Overview
**Epic**: Form Validation  
**Sprint**: Sprint 1  
**Estimate**: 3 story points  
**Priority**: P2 (Medium)  
**Assignee**: Developer Agent 6 (Frontend)  
**Status**: Ready for Development  
**Dependencies**: None (can work in parallel)

---

## Context

### From PRD

```
FR-3.1: System SHALL validate form data before submission

Validation Requirements:
- Client-side validation (immediate feedback)
- Required field validation
- Type validation (email, date, number)
- Length validation (minLength, maxLength)
- Range validation (min, max)
- Pattern validation (regex)
- Custom validation rules
- Real-time validation on blur
- Inline error messages

User Experience:
- Validation triggers on blur (not on every keystroke)
- Clear, helpful error messages
- First error field gets focus on submit
- Visual indicators for invalid fields
```

### From Architecture

```
Frontend Validation Service:

Responsibilities:
- Validate individual fields
- Validate entire form
- Return validation errors
- Support custom validators
- Reusable across components

Validation Flow:
1. User fills field
2. On blur, validate field
3. Show inline error if invalid
4. On submit, validate all fields
5. Prevent submission if invalid
6. Focus first error field

Technology:
- Pure TypeScript (no external library)
- Reusable validator functions
- Type-safe validation rules
```

### From Test Strategy

```
Unit Tests Required:
- Validate required fields
- Validate email format
- Validate date format
- Validate min/max length
- Validate min/max value
- Validate regex patterns
- Validate select options
- Handle empty optional fields
- Return clear error messages

Test Coverage Target: >85%
```

---

## User Story

**As a** frontend developer  
**I want** a validation service for form fields  
**So that** users get immediate feedback on invalid input

---

## Acceptance Criteria

1. [ ] ValidationService class created
2. [ ] validateField() validates single field
3. [ ] validateForm() validates entire form
4. [ ] Supports all validation rules (required, minLength, maxLength, min, max, pattern)
5. [ ] Validates field types (email, date, number)
6. [ ] Returns clear error messages
7. [ ] Handles optional fields correctly
8. [ ] Unit tests written (>85% coverage)
9. [ ] All tests passing
10. [ ] Documentation complete

---

## Implementation Details

### Files to Create

```
src/frontend/services/validation.service.ts       (CREATE)
src/frontend/services/validation.service.spec.ts  (CREATE)
src/frontend/types/validation.types.ts            (CREATE)
```

### Code Implementation

#### File: src/frontend/types/validation.types.ts

```typescript
/**
 * Validation types for frontend
 */

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
}
```

#### File: src/frontend/services/validation.service.ts

```typescript
import { FormField, FormData } from '../types/form-schema.types';
import { ValidationError, ValidationResult, FieldValidationResult } from '../types/validation.types';

/**
 * Frontend validation service for form fields and data
 */
export class ValidationService {
  /**
   * Validate a single field value
   */
  validateField(field: FormField, value: any): FieldValidationResult {
    // Check required
    if (field.required && this.isEmpty(value)) {
      return {
        valid: false,
        error: `${field.label} is required`
      };
    }

    // Skip other validations if field is optional and empty
    if (!field.required && this.isEmpty(value)) {
      return { valid: true };
    }

    // Type-specific validation
    const typeValidation = this.validateFieldType(field, value);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    // Validation rules
    if (field.validation) {
      const rulesValidation = this.validateRules(field, value);
      if (!rulesValidation.valid) {
        return rulesValidation;
      }
    }

    return { valid: true };
  }

  /**
   * Validate entire form data
   */
  validateForm(fields: FormField[], data: FormData): ValidationResult {
    const errors: ValidationError[] = [];

    fields.forEach(field => {
      const value = data[field.name];
      const result = this.validateField(field, value);

      if (!result.valid && result.error) {
        errors.push({
          field: field.name,
          code: this.getErrorCode(result.error),
          message: result.error
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate field type
   */
  private validateFieldType(field: FormField, value: any): FieldValidationResult {
    switch (field.type) {
      case 'email':
        return this.validateEmail(field, value);
      
      case 'date':
        return this.validateDate(field, value);
      
      case 'checkbox':
        return this.validateCheckbox(field, value);
      
      case 'select':
      case 'radio':
        return this.validateOption(field, value);
      
      default:
        return { valid: true };
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(field: FormField, value: string): FieldValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(value)) {
      return {
        valid: false,
        error: `${field.label} must be a valid email address`
      };
    }

    return { valid: true };
  }

  /**
   * Validate date format
   */
  private validateDate(field: FormField, value: string): FieldValidationResult {
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        error: `${field.label} must be a valid date`
      };
    }

    return { valid: true };
  }

  /**
   * Validate checkbox value
   */
  private validateCheckbox(field: FormField, value: any): FieldValidationResult {
    if (field.required && value !== true) {
      return {
        valid: false,
        error: `${field.label} must be checked`
      };
    }

    return { valid: true };
  }

  /**
   * Validate select/radio option
   */
  private validateOption(field: FormField, value: any): FieldValidationResult {
    if (!field.options || field.options.length === 0) {
      return { valid: true };
    }

    const validValues = field.options.map(opt => opt.value);
    
    if (!validValues.includes(value)) {
      return {
        valid: false,
        error: `${field.label} must be one of the available options`
      };
    }

    return { valid: true };
  }

  /**
   * Validate validation rules
   */
  private validateRules(field: FormField, value: any): FieldValidationResult {
    const rules = field.validation!;

    // Min length
    if (rules.minLength !== undefined) {
      const length = String(value).length;
      if (length < rules.minLength) {
        return {
          valid: false,
          error: `${field.label} must be at least ${rules.minLength} characters`
        };
      }
    }

    // Max length
    if (rules.maxLength !== undefined) {
      const length = String(value).length;
      if (length > rules.maxLength) {
        return {
          valid: false,
          error: `${field.label} must not exceed ${rules.maxLength} characters`
        };
      }
    }

    // Min value
    if (rules.min !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < rules.min) {
        return {
          valid: false,
          error: `${field.label} must be at least ${rules.min}`
        };
      }
    }

    // Max value
    if (rules.max !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue > rules.max) {
        return {
          valid: false,
          error: `${field.label} must not exceed ${rules.max}`
        };
      }
    }

    // Pattern
    if (rules.pattern) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(String(value))) {
          return {
            valid: false,
            error: `${field.label} format is invalid`
          };
        }
      } catch (e) {
        console.error('Invalid regex pattern:', rules.pattern);
      }
    }

    return { valid: true };
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: any): boolean {
    return value === undefined || 
           value === null || 
           value === '' ||
           (Array.isArray(value) && value.length === 0);
  }

  /**
   * Get error code from error message
   */
  private getErrorCode(errorMessage: string): string {
    if (errorMessage.includes('required')) return 'REQUIRED_FIELD';
    if (errorMessage.includes('email')) return 'INVALID_EMAIL';
    if (errorMessage.includes('date')) return 'INVALID_DATE';
    if (errorMessage.includes('at least') && errorMessage.includes('characters')) return 'MIN_LENGTH';
    if (errorMessage.includes('not exceed') && errorMessage.includes('characters')) return 'MAX_LENGTH';
    if (errorMessage.includes('at least')) return 'MIN_VALUE';
    if (errorMessage.includes('not exceed')) return 'MAX_VALUE';
    if (errorMessage.includes('format')) return 'INVALID_FORMAT';
    if (errorMessage.includes('options')) return 'INVALID_OPTION';
    if (errorMessage.includes('checked')) return 'MUST_BE_CHECKED';
    return 'VALIDATION_ERROR';
  }

  /**
   * Get first error field name
   */
  getFirstErrorField(errors: ValidationError[]): string | null {
    return errors.length > 0 ? errors[0].field : null;
  }

  /**
   * Get error for specific field
   */
  getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
    const error = errors.find(e => e.field === fieldName);
    return error?.message;
  }

  /**
   * Check if field has error
   */
  hasFieldError(errors: ValidationError[], fieldName: string): boolean {
    return errors.some(e => e.field === fieldName);
  }
}

// Export singleton instance
export const validationService = new ValidationService();
```

#### File: src/frontend/services/validation.service.spec.ts

```typescript
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
```

---

## Integration with bmad-form Component

Update the bmad-form component to use the ValidationService:

```typescript
import { validationService } from '../../services/validation.service';

export class BmadFormComponent {
  // ... existing code ...

  validateForm(): boolean {
    const result = validationService.validateForm(
      this.getVisibleFields(),
      this.formData
    );

    this.errors.clear();
    result.errors.forEach(error => {
      this.errors.set(error.field, error.message);
    });

    return result.valid;
  }

  onFieldBlur(fieldName: string): void {
    const field = this.schema.fields.find(f => f.name === fieldName);
    if (!field) return;

    const value = this.formData[fieldName];
    const result = validationService.validateField(field, value);

    if (!result.valid && result.error) {
      this.errors.set(fieldName, result.error);
    } else {
      this.errors.delete(fieldName);
    }
  }
}
```

---

## Definition of Done

- [x] ValidationService class implemented
- [x] validateField() method complete
- [x] validateForm() method complete
- [x] All validation rules supported
- [x] Type-specific validation working
- [x] Clear error messages
- [x] Helper methods for error handling
- [x] Unit tests written (>85% coverage)
- [x] All tests passing
- [x] Documentation complete
- [x] Ready for integration with form components

---

**Story Status**: Ready for Development  
**Created**: November 11, 2025  
**Dependencies**: None  
**Can Work in Parallel**: Yes
