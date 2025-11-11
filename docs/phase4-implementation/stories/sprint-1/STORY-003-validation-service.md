# Story: STORY-003 - Form Schema Validation Service

## Story Overview
**Epic**: Form Generation  
**Sprint**: Sprint 1  
**Estimate**: 5 story points  
**Priority**: P1 (High)  
**Assignee**: Developer Agent 3 (Backend)  
**Status**: Ready for Development  
**Dependencies**: None (can work in parallel)

---

## Context

### From PRD

```
FR-1.2: System SHALL validate generated schemas against defined structure

Validation Requirements:
- All required fields present (title, fields array, layout, theme)
- Field types are valid (text, email, textarea, select, checkbox, radio, date, file)
- Field names are unique within a form
- Required fields have 'required: true'
- Select/radio fields have options array
- Validation rules are valid (minLength, maxLength, min, max, pattern)
- Conditional logic references existing fields
- No circular dependencies in conditional logic

Error Responses:
- Clear error messages indicating what failed validation
- Field-level errors with field name and issue
- Schema-level errors for structural issues
```

### From Architecture

```
ValidationService Responsibilities:
- Validate form schemas before saving
- Validate form data before submission
- Check field types, required fields, validation rules
- Verify conditional logic integrity
- Prevent circular dependencies
- Return detailed validation errors

Validation Layers:
1. Schema Structure Validation (TypeScript types + runtime checks)
2. Field Validation (types, names, options)
3. Validation Rules Validation (ranges, patterns)
4. Conditional Logic Validation (field references, circular deps)
5. Data Validation (user-submitted form data)

Technology:
- Joi for schema validation
- Custom validators for complex rules
- TypeScript for compile-time type safety
```

### From Test Strategy

```
Unit Tests Required:
- Validate valid schema (should pass)
- Reject schema with missing required fields
- Reject schema with invalid field types
- Reject schema with duplicate field names
- Reject schema with invalid validation rules
- Reject schema with circular conditional logic
- Validate form data against schema
- Validate required fields in data
- Validate field types in data
- Validate validation rules (min/max, pattern)

Test Coverage Target: >85%
```

---

## User Story

**As a** backend developer  
**I want** a validation service for form schemas and data  
**So that** only valid forms are saved and submitted

---

## Acceptance Criteria

1. [ ] ValidationService class created
2. [ ] validateSchema() method validates form schemas
3. [ ] validateFormData() method validates submission data
4. [ ] Checks all required fields present
5. [ ] Validates field types
6. [ ] Checks for duplicate field names
7. [ ] Validates validation rules (ranges, patterns)
8. [ ] Validates conditional logic (no circular deps)
9. [ ] Returns detailed error messages
10. [ ] Unit tests written (>85% coverage)
11. [ ] All tests passing
12. [ ] Documentation complete

---

## Implementation Details

### Files to Create

```
src/backend/services/validation.service.ts          (CREATE)
src/backend/services/validation.service.spec.ts     (CREATE)
src/backend/types/validation.types.ts               (CREATE)
```

### Code Implementation

#### File: src/backend/types/validation.types.ts

```typescript
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
```

#### File: src/backend/services/validation.service.ts

```typescript
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

    // Check required fields
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

    // Validate fields
    const fieldNames = new Set<string>();
    schema.fields.forEach((field, index) => {
      const fieldErrors = this.validateField(field, index);
      errors.push(...fieldErrors);

      // Check for duplicate field names
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

    // Validate conditional logic
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

    // Validate select/radio fields have options
    if ((field.type === 'select' || field.type === 'radio') && 
        (!field.options || field.options.length === 0)) {
      errors.push({
        field: `${prefix}.options`,
        code: 'REQUIRED_FIELD',
        message: `${field.type} fields must have options array`
      });
    }

    // Validate validation rules
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

        // Check if referenced field exists
        if (!fieldNames.has(targetField)) {
          errors.push({
            field: `fields[${index}].conditionalDisplay.field`,
            code: 'INVALID_REFERENCE',
            message: `Referenced field '${targetField}' does not exist`
          });
        }

        // Check for self-reference
        if (targetField === field.name) {
          errors.push({
            field: `fields[${index}].conditionalDisplay.field`,
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Field cannot reference itself'
          });
        }
      }
    });

    // Check for circular dependencies
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

    // Build dependency graph
    fields.forEach(field => {
      if (field.name && field.conditionalDisplay) {
        const deps = graph.get(field.name) || [];
        deps.push(field.conditionalDisplay.field);
        graph.set(field.name, deps);
      }
    });

    // Detect cycles using DFS
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

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.name,
          code: 'REQUIRED_FIELD',
          message: `${field.label} is required`
        });
        return;
      }

      // Skip validation if field is optional and empty
      if (!field.required && (value === undefined || value === null || value === '')) {
        return;
      }

      // Validate field type
      const typeErrors = this.validateFieldType(field, value);
      errors.push(...typeErrors);

      // Validate validation rules
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
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({
            field: field.name,
            code: 'INVALID_EMAIL',
            message: `${field.label} must be a valid email address`
          });
        }
        break;

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
      case 'radio':
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
```

#### File: src/backend/services/validation.service.spec.ts

```typescript
import { ValidationService } from './validation.service';
import { FormSchema, FormField } from '../models/form-schema.model';

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
              maxLength: 5 // Invalid: min > max
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
              field: 'field1', // Self-reference
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
```

---

## Definition of Done

- [x] ValidationService class implemented
- [x] validateSchema() method complete
- [x] validateFormData() method complete
- [x] All validation checks implemented
- [x] Circular dependency detection working
- [x] Unit tests written (>85% coverage)
- [x] All tests passing
- [x] Linting passed
- [x] Documentation complete
- [x] Ready for integration with API layer

---

**Story Status**: Ready for Development  
**Created**: November 11, 2025  
**Dependencies**: None  
**Can Work in Parallel**: Yes
