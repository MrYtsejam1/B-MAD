/**
 * Base field component for all form field types
 * Simplified TypeScript implementation following web components pattern
 */

import { FormField } from '../../types/form-schema.types';
import { ValidationService } from '../../services/validation.service';

export abstract class BaseFieldComponent {
  protected field: FormField;
  protected value: any;
  protected validationService: ValidationService;
  protected error: string | undefined;

  constructor(field: FormField) {
    this.field = field;
    this.value = this.getDefaultValue();
    this.validationService = new ValidationService();
  }

  /**
   * Get default value for field type
   */
  protected abstract getDefaultValue(): any;

  /**
   * Render field HTML
   */
  abstract render(): string;

  /**
   * Set field value
   */
  setValue(value: any): void {
    this.value = value;
    this.validate();
  }

  /**
   * Get field value
   */
  getValue(): any {
    return this.value;
  }

  /**
   * Validate field
   */
  validate(): boolean {
    const result = this.validationService.validateField(this.field, this.value);
    this.error = result.error;
    return result.valid;
  }

  /**
   * Check if field has error
   */
  hasError(): boolean {
    return this.error !== undefined;
  }

  /**
   * Get error message
   */
  getError(): string | undefined {
    return this.error;
  }

  /**
   * Get field name
   */
  getName(): string {
    return this.field.name;
  }

  /**
   * Check if field is required
   */
  isRequired(): boolean {
    return this.field.required;
  }
}
