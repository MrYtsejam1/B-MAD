import { FormSchema, FormField } from '../models/form-schema.model';
import { ValidationResult, ValidationError } from '../types/validation.types';
import { logger } from '../utils/logger';

/**
 * Validation service for form schemas and data
 */
export class ValidationService {
  private readonly VALID_FIELD_TYPES = [
    'text', 'email', 'textarea', 'select', 
    'checkbox', 'radio', 'date', 'file'
  ];

  private readonly VALID_LAYOUTS = ['vertical', 'horizontal', 'grid'];
  private readonly VALID_THEMES = ['light', 'dark'];

  /**
   * Validate form schema structure and rules
   */
  validateSchema(schema: Partial<FormSchema>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!schema.title || schema.title.trim().length === 0) {
      errors.push({
        field: 'title',
        code: 'REQUIRED_FIELD',
        message: 'Title is required'
      });
    }

    if (!schema.fields || !Array.isArray(schema.fields)) {
      errors.push({
        field: 'fields',
        code: 'REQUIRED_FIELD',
        message: 'Fields array is required'
      });
      return { valid: false, errors };
    }

    if (schema.fields.length === 0) {
      errors.push({
        field: 'fields',
        code: 'EMPTY_ARRAY',
        message: 'At least one field is required'
      });
    }

    if (!schema.layout || !this.VALID_LAYOUTS.includes(schema.layout)) {
      errors.push({
        field: 'layout',
        code: 'INVALID_VALUE',
        message: `Layout must be one of: ${this.VALID_LAYOUTS.join(', ')}`
      });
    }

    if (!schema.theme || !this.VALID_THEMES.includes(schema.theme)) {
      errors.push({
        field: 'theme',
        code: 'INVALID_VALUE',
        message: `Theme must be one of: ${this.VALID_THEMES.join(', ')}`
      });
    }

    const fieldNames = new Set<string>();
    schema.fields.forEach((field, index) => {
      const fieldErrors = this.validateField(field, index);
      errors.push(...fieldErrors);

      if (field.name) {
        if (fieldNames.has(field.name)) {
          errors.push({
            field: `fields[${index}].name`,
            code: 'DUPLICATE_FIELD',
            message: `Duplicate field name: ${field.name}`
          });
        }
        fieldNames.add(field.name);
      }
    });

    const conditionalErrors = this.validateConditionalLogic(schema.fields);
    errors.push(...conditionalErrors);

    const valid = errors.length === 0;
    if (!valid) {
      logger.warn('Schema validation failed', { errors, schema });
    }

    return { valid, errors };
  }

  /**
   * Validate individual field
   */
  private validateField(field: Partial<FormField>, index: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const prefix = `fields[${index}]`;

    if (!field.name || field.name.trim().length === 0) {
      errors.push({
        field: `${prefix}.name`,
        code: 'REQUIRED_FIELD',
        message: 'Field name is required'
      });
    }

    if (!field.type || !this.VALID_FIELD_TYPES.includes(field.type)) {
      errors.push({
        field: `${prefix}.type`,
        code: 'INVALID_TYPE',
        message: `Field type must be one of: ${this.VALID_FIELD_TYPES.join(', ')}`
      });
    }

    if (!field.label || field.label.trim().length === 0) {
      errors.push({
        field: `${prefix}.label`,
        code: 'REQUIRED_FIELD',
        message: 'Field label is required'
      });
    }

    if (field.required === undefined || field.required === null) {
      errors.push({
        field: `${prefix}.required`,
        code: 'REQUIRED_FIELD',
        message: 'Field required property is required'
      });
    }

    if ((field.type === 'select' || field.type === 'radio') && 
        (!field.options || field.options.length === 0)) {
      errors.push({
        field: `${prefix}.options`,
        code: 'REQUIRED_FIELD',
        message: `${field.type} fields must have options array`
      });
    }

    if (field.validation) {
      const validationErrors = this.validateValidationRules(field.validation, prefix);
      errors.push(...validationErrors);
    }

    return errors;
  }

  /**
   * Validate validation rules
   */
  private validateValidationRules(rules: any, prefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (rules.minLength !== undefined && rules.minLength < 0) {
      errors.push({
        field: `${prefix}.validation.minLength`,
        code: 'INVALID_VALUE',
        message: 'minLength must be >= 0'
      });
    }

    if (rules.maxLength !== undefined && rules.maxLength < 0) {
      errors.push({
        field: `${prefix}.validation.maxLength`,
        code: 'INVALID_VALUE',
        message: 'maxLength must be >= 0'
      });
    }

    if (rules.minLength !== undefined && rules.maxLength !== undefined &&
        rules.minLength > rules.maxLength) {
      errors.push({
        field: `${prefix}.validation`,
        code: 'INVALID_RANGE',
        message: 'minLength must be <= maxLength'
      });
    }

    if (rules.min !== undefined && rules.max !== undefined &&
        rules.min > rules.max) {
      errors.push({
        field: `${prefix}.validation`,
        code: 'INVALID_RANGE',
        message: 'min must be <= max'
      });
    }

    if (rules.pattern !== undefined) {
      try {
        new RegExp(rules.pattern);
      } catch (e) {
        errors.push({
          field: `${prefix}.validation.pattern`,
          code: 'INVALID_PATTERN',
          message: 'Invalid regular expression pattern'
        });
      }
    }

    return errors;
  }

  /**
   * Validate conditional logic and check for circular dependencies
   */
  private validateConditionalLogic(fields: Partial<FormField>[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldNames = new Set(fields.map(f => f.name).filter(Boolean));

    fields.forEach((field, index) => {
      if (field.conditionalDisplay) {
        const { field: targetField } = field.conditionalDisplay;

        if (!fieldNames.has(targetField)) {
          errors.push({
            field: `fields[${index}].conditionalDisplay.field`,
            code: 'INVALID_REFERENCE',
            message: `Referenced field '${targetField}' does not exist`
          });
        }

        if (targetField === field.name) {
          errors.push({
            field: `fields[${index}].conditionalDisplay.field`,
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Field cannot reference itself'
          });
        }
      }
    });

    const circularErrors = this.detectCircularDependencies(fields);
    errors.push(...circularErrors);

    return errors;
  }

  /**
   * Detect circular dependencies in conditional logic
   */
  private detectCircularDependencies(fields: Partial<FormField>[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const graph = new Map<string, string[]>();

    fields.forEach(field => {
      if (field.name && field.conditionalDisplay) {
        const deps = graph.get(field.name) || [];
        deps.push(field.conditionalDisplay.field);
        graph.set(field.name, deps);
      }
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          errors.push({
            code: 'CIRCULAR_DEPENDENCY',
            message: `Circular dependency detected in conditional logic involving field '${node}'`
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate form data against schema
   */
  validateFormData(data: Record<string, any>, schema: FormSchema): ValidationResult {
    const errors: ValidationError[] = [];

    schema.fields.forEach(field => {
      const value = data[field.name];

      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.name,
          code: 'REQUIRED_FIELD',
          message: `${field.label} is required`
        });
        return;
      }

      if (!field.required && (value === undefined || value === null || value === '')) {
        return;
      }

      const typeErrors = this.validateFieldType(field, value);
      errors.push(...typeErrors);

      if (field.validation) {
        const ruleErrors = this.validateFieldRules(field, value);
        errors.push(...ruleErrors);
      }
    });

    const valid = errors.length === 0;
    if (!valid) {
      logger.warn('Form data validation failed', { errors, data });
    }

    return { valid, errors };
  }

  /**
   * Validate field type
   */
  private validateFieldType(field: FormField, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (field.type) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({
            field: field.name,
            code: 'INVALID_EMAIL',
            message: `${field.label} must be a valid email address`
          });
        }
        break;
      }

      case 'date':
        if (isNaN(Date.parse(value))) {
          errors.push({
            field: field.name,
            code: 'INVALID_DATE',
            message: `${field.label} must be a valid date`
          });
        }
        break;

      case 'checkbox':
        if (typeof value !== 'boolean') {
          errors.push({
            field: field.name,
            code: 'INVALID_TYPE',
            message: `${field.label} must be a boolean`
          });
        }
        break;

      case 'select':
      case 'radio': {
        const validValues = field.options?.map(opt => opt.value) || [];
        if (!validValues.includes(value)) {
          errors.push({
            field: field.name,
            code: 'INVALID_OPTION',
            message: `${field.label} must be one of the available options`
          });
        }
        break;
      }
    }

    return errors;
  }

  /**
   * Validate field rules
   */
  private validateFieldRules(field: FormField, value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = field.validation!;

    if (rules.minLength !== undefined && value.length < rules.minLength) {
      errors.push({
        field: field.name,
        code: 'MIN_LENGTH',
        message: `${field.label} must be at least ${rules.minLength} characters`
      });
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      errors.push({
        field: field.name,
        code: 'MAX_LENGTH',
        message: `${field.label} must not exceed ${rules.maxLength} characters`
      });
    }

    if (rules.min !== undefined && Number(value) < rules.min) {
      errors.push({
        field: field.name,
        code: 'MIN_VALUE',
        message: `${field.label} must be at least ${rules.min}`
      });
    }

    if (rules.max !== undefined && Number(value) > rules.max) {
      errors.push({
        field: field.name,
        code: 'MAX_VALUE',
        message: `${field.label} must not exceed ${rules.max}`
      });
    }

    if (rules.pattern !== undefined) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: field.name,
          code: 'PATTERN_MISMATCH',
          message: `${field.label} format is invalid`
        });
      }
    }

    return errors;
  }
}
