import { FormSchema, FormField, ValidationRules, ConditionalLogic } from '../models/form-schema.model';
import { logger } from '../utils/logger';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class ValidationService {
}
