import { TextFieldComponent } from './text-field.component';
import { EmailFieldComponent } from './email-field.component';
import { SelectFieldComponent } from './select-field.component';
import { CheckboxFieldComponent } from './checkbox-field.component';
import { FormField } from '../../types/form-schema.types';

describe('Field Components', () => {
  describe('TextFieldComponent', () => {
    it('should create text field with default value', () => {
      const field: FormField = {
        name: 'username',
        type: 'text',
        label: 'Username',
        required: true
      };

      const component = new TextFieldComponent(field);
      expect(component.getValue()).toBe('');
      expect(component.getName()).toBe('username');
      expect(component.isRequired()).toBe(true);
    });

    it('should set and get value', () => {
      const field: FormField = {
        name: 'username',
        type: 'text',
        label: 'Username',
        required: false
      };

      const component = new TextFieldComponent(field);
      component.setValue('john_doe');
      expect(component.getValue()).toBe('john_doe');
    });

    it('should validate required field', () => {
      const field: FormField = {
        name: 'username',
        type: 'text',
        label: 'Username',
        required: true
      };

      const component = new TextFieldComponent(field);
      expect(component.validate()).toBe(false);
      expect(component.hasError()).toBe(true);

      component.setValue('john_doe');
      expect(component.validate()).toBe(true);
      expect(component.hasError()).toBe(false);
    });

    it('should render HTML', () => {
      const field: FormField = {
        name: 'username',
        type: 'text',
        label: 'Username',
        required: true,
        placeholder: 'Enter username'
      };

      const component = new TextFieldComponent(field);
      const html = component.render();

      expect(html).toContain('Username');
      expect(html).toContain('username');
      expect(html).toContain('required');
      expect(html).toContain('Enter username');
    });
  });

  describe('EmailFieldComponent', () => {
    it('should validate email format', () => {
      const field: FormField = {
        name: 'email',
        type: 'email',
        label: 'Email',
        required: true
      };

      const component = new EmailFieldComponent(field);
      
      component.setValue('invalid-email');
      expect(component.validate()).toBe(false);
      expect(component.hasError()).toBe(true);

      component.setValue('test@example.com');
      expect(component.validate()).toBe(true);
      expect(component.hasError()).toBe(false);
    });

    it('should render email input', () => {
      const field: FormField = {
        name: 'email',
        type: 'email',
        label: 'Email',
        required: true
      };

      const component = new EmailFieldComponent(field);
      const html = component.render();

      expect(html).toContain('type="email"');
      expect(html).toContain('Email');
    });
  });

  describe('SelectFieldComponent', () => {
    it('should handle select options', () => {
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

      const component = new SelectFieldComponent(field);
      
      component.setValue('us');
      expect(component.validate()).toBe(true);

      component.setValue('invalid');
      expect(component.validate()).toBe(false);
    });

    it('should render select dropdown', () => {
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

      const component = new SelectFieldComponent(field);
      const html = component.render();

      expect(html).toContain('<select');
      expect(html).toContain('United States');
      expect(html).toContain('Canada');
    });
  });

  describe('CheckboxFieldComponent', () => {
    it('should handle boolean value', () => {
      const field: FormField = {
        name: 'terms',
        type: 'checkbox',
        label: 'Accept Terms',
        required: true
      };

      const component = new CheckboxFieldComponent(field);
      expect(component.getValue()).toBe(false);

      component.setValue(true);
      expect(component.getValue()).toBe(true);
      expect(component.validate()).toBe(true);
    });

    it('should validate required checkbox', () => {
      const field: FormField = {
        name: 'terms',
        type: 'checkbox',
        label: 'Accept Terms',
        required: true
      };

      const component = new CheckboxFieldComponent(field);
      expect(component.validate()).toBe(false);

      component.setValue(true);
      expect(component.validate()).toBe(true);
    });

    it('should render checkbox input', () => {
      const field: FormField = {
        name: 'terms',
        type: 'checkbox',
        label: 'Accept Terms',
        required: true
      };

      const component = new CheckboxFieldComponent(field);
      const html = component.render();

      expect(html).toContain('type="checkbox"');
      expect(html).toContain('Accept Terms');
    });
  });
});
