import { FormRendererComponent, FormSchema } from './form-renderer.component';
import { FormField } from '../../types/form-schema.types';

describe('FormRendererComponent', () => {
  let schema: FormSchema;

  beforeEach(() => {
    schema = {
      id: 'test-form',
      title: 'Test Form',
      description: 'A test form',
      layout: 'vertical',
      theme: 'light',
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
          required: true,
          validation: { min: 18 }
        }
      ]
    };
  });

  describe('initialization', () => {
    it('should create form renderer with schema', () => {
      const renderer = new FormRendererComponent(schema);
      
      expect(renderer.getSchema()).toEqual(schema);
    });

    it('should initialize field components', () => {
      const renderer = new FormRendererComponent(schema);
      const formData = renderer.getFormData();
      
      expect(formData).toHaveProperty('email');
      expect(formData).toHaveProperty('age');
    });
  });

  describe('form data management', () => {
    it('should set and get form data', () => {
      const renderer = new FormRendererComponent(schema);
      
      const data = {
        email: 'test@example.com',
        age: '25'
      };
      
      renderer.setFormData(data);
      expect(renderer.getFormData()).toEqual(data);
    });

    it('should set and get individual field values', () => {
      const renderer = new FormRendererComponent(schema);
      
      renderer.setFieldValue('email', 'test@example.com');
      expect(renderer.getFieldValue('email')).toBe('test@example.com');
    });

    it('should reset form data', () => {
      const renderer = new FormRendererComponent(schema);
      
      renderer.setFormData({
        email: 'test@example.com',
        age: '25'
      });
      
      renderer.reset();
      const formData = renderer.getFormData();
      
      expect(formData.email).toBe('');
      expect(formData.age).toBe('');
    });
  });

  describe('validation', () => {
    it('should validate form with valid data', () => {
      const renderer = new FormRendererComponent(schema);
      
      renderer.setFormData({
        email: 'test@example.com',
        age: '25'
      });
      
      expect(renderer.validateForm()).toBe(true);
    });

    it('should validate form with invalid data', () => {
      const renderer = new FormRendererComponent(schema);
      
      renderer.setFormData({
        email: 'invalid-email',
        age: '15'
      });
      
      expect(renderer.validateForm()).toBe(false);
    });

    it('should validate form with missing required fields', () => {
      const renderer = new FormRendererComponent(schema);
      
      renderer.setFormData({
        email: '',
        age: ''
      });
      
      expect(renderer.validateForm()).toBe(false);
    });
  });

  describe('form submission', () => {
    it('should handle valid form submission', () => {
      const renderer = new FormRendererComponent(schema);
      let submittedData: any = null;
      
      renderer.onSubmit((data) => {
        submittedData = data;
      });
      
      renderer.setFormData({
        email: 'test@example.com',
        age: '25'
      });
      
      const result = renderer.handleSubmit();
      
      expect(result).toBe(true);
      expect(submittedData).toEqual({
        email: 'test@example.com',
        age: '25'
      });
    });

    it('should not submit invalid form', () => {
      const renderer = new FormRendererComponent(schema);
      let submittedData: any = null;
      
      renderer.onSubmit((data) => {
        submittedData = data;
      });
      
      renderer.setFormData({
        email: 'invalid-email',
        age: '15'
      });
      
      const result = renderer.handleSubmit();
      
      expect(result).toBe(false);
      expect(submittedData).toBeNull();
    });
  });

  describe('rendering', () => {
    it('should render form HTML', () => {
      const renderer = new FormRendererComponent(schema);
      const html = renderer.render();
      
      expect(html).toContain('Test Form');
      expect(html).toContain('A test form');
      expect(html).toContain('Email');
      expect(html).toContain('Age');
      expect(html).toContain('Submit');
    });

    it('should apply theme class', () => {
      const renderer = new FormRendererComponent(schema);
      const html = renderer.render();
      
      expect(html).toContain('theme-light');
    });

    it('should apply layout class', () => {
      const renderer = new FormRendererComponent(schema);
      const html = renderer.render();
      
      expect(html).toContain('layout-vertical');
    });

    it('should use custom submit button text', () => {
      schema.submitButtonText = 'Send Form';
      const renderer = new FormRendererComponent(schema);
      const html = renderer.render();
      
      expect(html).toContain('Send Form');
    });
  });

  describe('conditional display', () => {
    it('should filter visible fields based on conditional logic', () => {
      const conditionalSchema: FormSchema = {
        id: 'conditional-form',
        title: 'Conditional Form',
        layout: 'vertical',
        theme: 'light',
        fields: [
          {
            name: 'hasAccount',
            type: 'checkbox',
            label: 'I have an account',
            required: false
          },
          {
            name: 'username',
            type: 'text',
            label: 'Username',
            required: true,
            conditionalDisplay: {
              field: 'hasAccount',
              operator: 'equals',
              value: true,
              action: 'show'
            }
          }
        ]
      };
      
      const renderer = new FormRendererComponent(conditionalSchema);
      
      renderer.setFieldValue('hasAccount', false);
      let visibleFields = renderer.getVisibleFields();
      expect(visibleFields.length).toBe(1);
      expect(visibleFields[0].name).toBe('hasAccount');
      
      renderer.setFieldValue('hasAccount', true);
      visibleFields = renderer.getVisibleFields();
      expect(visibleFields.length).toBe(2);
    });
  });
});
