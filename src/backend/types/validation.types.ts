/**
 * Validation types and interfaces
 */

export interface ValidationError {
  field?: string;
  code: string;
  message: string;
  details?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface FieldValidationContext {
  fieldName: string;
  fieldType: string;
  value: any;
  schema: any;
}
