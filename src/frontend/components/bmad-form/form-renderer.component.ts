/**
 * Form Renderer Component
 * Renders complete form with all fields, validation, and submission handling
 */

import { FormField, FormData } from '../../types/form-schema.types';
import { ValidationService } from '../../services/validation.service';
import { FieldFactory } from '../fields/field-factory';
import { BaseFieldComponent } from '../fields/base-field.component';

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  layout: 'vertical' | 'horizontal' | 'grid';
  theme: 'light' | 'dark';
  submitButtonText?: string;
}

export class FormRendererComponent {
  private schema: FormSchema;
  private fieldComponents: Map<string, BaseFieldComponent>;
  private validationService: ValidationService;
  private formData: FormData;
  private onSubmitCallback?: (data: FormData) => void;

  constructor(schema: FormSchema) {
    this.schema = schema;
    this.fieldComponents = new Map();
    this.validationService = new ValidationService();
    this.formData = {};
    this.initializeFields();
  }

  /**
   * Initialize field components
   */
  private initializeFields(): void {
    this.schema.fields.forEach(field => {
      const component = FieldFactory.createField(field);
      this.fieldComponents.set(field.name, component);
      this.formData[field.name] = component.getValue();
    });
  }

  /**
   * Set form data
   */
  setFormData(data: FormData): void {
    Object.keys(data).forEach(fieldName => {
      const component = this.fieldComponents.get(fieldName);
      if (component) {
        component.setValue(data[fieldName]);
        this.formData[fieldName] = data[fieldName];
      }
    });
  }

  /**
   * Get form data
   */
  getFormData(): FormData {
    return { ...this.formData };
  }

  /**
   * Set field value
   */
  setFieldValue(fieldName: string, value: any): void {
    const component = this.fieldComponents.get(fieldName);
    if (component) {
      component.setValue(value);
      this.formData[fieldName] = value;
    }
  }

  /**
   * Get field value
   */
  getFieldValue(fieldName: string): any {
    return this.formData[fieldName];
  }

  /**
   * Validate form
   */
  validateForm(): boolean {
    const result = this.validationService.validateForm(this.schema.fields, this.formData);
    
    this.fieldComponents.forEach((component, fieldName) => {
      component.validate();
    });

    return result.valid;
  }

  /**
   * Handle form submission
   */
  handleSubmit(): boolean {
    const isValid = this.validateForm();
    
    if (isValid && this.onSubmitCallback) {
      this.onSubmitCallback(this.getFormData());
    }

    return isValid;
  }

  /**
   * Set submit callback
   */
  onSubmit(callback: (data: FormData) => void): void {
    this.onSubmitCallback = callback;
  }

  /**
   * Render form HTML
   */
  render(): string {
    const themeClass = `theme-${this.schema.theme}`;
    const layoutClass = `layout-${this.schema.layout}`;
    const submitText = this.schema.submitButtonText || 'Submit';

    const fieldsHtml = this.schema.fields
      .map(field => {
        const component = this.fieldComponents.get(field.name);
        return component ? component.render() : '';
      })
      .join('\n');

    return `
      <form class="bmad-form ${themeClass} ${layoutClass}" id="${this.schema.id}">
        <div class="form-header">
          <h2 class="form-title">${this.schema.title}</h2>
          ${this.schema.description ? `<p class="form-description">${this.schema.description}</p>` : ''}
        </div>

        <div class="form-fields">
          ${fieldsHtml}
        </div>

        <div class="form-actions">
          <button type="submit" class="submit-button">
            ${submitText}
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Get visible fields (considering conditional logic)
   */
  getVisibleFields(): FormField[] {
    return this.schema.fields.filter(field => {
      if (!field.conditionalDisplay) {
        return true;
      }

      const dependentValue = this.formData[field.conditionalDisplay.field];
      const targetValue = field.conditionalDisplay.value;
      const operator = field.conditionalDisplay.operator;
      const action = field.conditionalDisplay.action;

      let condition = false;
      switch (operator) {
        case 'equals':
          condition = dependentValue === targetValue;
          break;
        case 'notEquals':
          condition = dependentValue !== targetValue;
          break;
        case 'contains':
          condition = String(dependentValue).includes(String(targetValue));
          break;
        case 'greaterThan':
          condition = Number(dependentValue) > Number(targetValue);
          break;
        case 'lessThan':
          condition = Number(dependentValue) < Number(targetValue);
          break;
      }

      return action === 'show' ? condition : !condition;
    });
  }

  /**
   * Reset form
   */
  reset(): void {
    this.fieldComponents.forEach((component, fieldName) => {
      const defaultValue = component['getDefaultValue'] ? component['getDefaultValue']() : '';
      component.setValue(defaultValue);
      this.formData[fieldName] = defaultValue;
    });
  }

  /**
   * Get form schema
   */
  getSchema(): FormSchema {
    return this.schema;
  }
}
