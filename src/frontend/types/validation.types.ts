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
