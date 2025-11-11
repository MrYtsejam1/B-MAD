import { FormField } from '../../types/form-schema.types';
import { BaseFieldComponent } from './base-field.component';
import { TextFieldComponent } from './text-field.component';
import { EmailFieldComponent } from './email-field.component';
import { SelectFieldComponent } from './select-field.component';
import { CheckboxFieldComponent } from './checkbox-field.component';

/**
 * Factory for creating field components based on field type
 */
export class FieldFactory {
  static createField(field: FormField): BaseFieldComponent {
    switch (field.type) {
      case 'email':
        return new EmailFieldComponent(field);
      
      case 'select':
        return new SelectFieldComponent(field);
      
      case 'checkbox':
        return new CheckboxFieldComponent(field);
      
      case 'text':
      case 'textarea':
      case 'radio':
      case 'date':
      case 'file':
      default:
        return new TextFieldComponent(field);
    }
  }
}
