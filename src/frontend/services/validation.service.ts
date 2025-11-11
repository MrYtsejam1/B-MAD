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
    if (field.required && this.isEmpty(value)) {
      return {
        valid: false,
        error: `${field.label} is required`
      };
    }

    if (!field.required && this.isEmpty(value)) {
      return { valid: true };
    }

    const typeValidation = this.validateFieldType(field, value);
    if (!typeValidation.valid) {
      return typeValidation;
    }

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

    if (rules.minLength !== undefined) {
      const length = String(value).length;
      if (length < rules.minLength) {
        return {
          valid: false,
          error: `${field.label} must be at least ${rules.minLength} characters`
        };
      }
    }

    if (rules.maxLength !== undefined) {
      const length = String(value).length;
      if (length > rules.maxLength) {
        return {
          valid: false,
          error: `${field.label} must not exceed ${rules.maxLength} characters`
        };
      }
    }

    if (rules.min !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < rules.min) {
        return {
          valid: false,
          error: `${field.label} must be at least ${rules.min}`
        };
      }
    }

    if (rules.max !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue > rules.max) {
        return {
          valid: false,
          error: `${field.label} must not exceed ${rules.max}`
        };
      }
    }

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

export const validationService = new ValidationService();
