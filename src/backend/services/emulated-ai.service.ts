import { FormSchema } from '../models/form-schema.model';
import { logger } from '../utils/logger';

/**
 * Emulated AI service that generates realistic forms without external API calls
 * Intelligently parses user descriptions to create appropriate form schemas
 */
export class EmulatedAIService {
  /**
   * Generate form schema by parsing description keywords
   */
  generateFormSchema(description: string): FormSchema {
    logger.info('Using emulated AI provider', { description });

    const lowerDesc = description.toLowerCase();
    const fields: any[] = [];
    let title = this.extractTitle(description);
    
    if (this.matches(lowerDesc, ['contact', 'reach', 'get in touch'])) {
      title = title || 'Contact Form';
      fields.push(
        this.createField('name', 'text', 'Full Name', true, { minLength: 2, maxLength: 100 }),
        this.createField('email', 'email', 'Email Address', true),
        this.createField('phone', 'text', 'Phone Number', false, { pattern: '^[0-9\\-\\+\\s\\(\\)]+$' }),
        this.createField('message', 'textarea', 'Message', true, { minLength: 10, maxLength: 1000 })
      );
    } else if (this.matches(lowerDesc, ['registration', 'register', 'sign up', 'signup', 'account'])) {
      title = title || 'Registration Form';
      fields.push(
        this.createField('username', 'text', 'Username', true, { minLength: 3, maxLength: 20, pattern: '^[a-zA-Z0-9_]+$' }),
        this.createField('email', 'email', 'Email Address', true),
        this.createField('password', 'password', 'Password', true, { minLength: 8 }),
        this.createField('confirm_password', 'password', 'Confirm Password', true, { minLength: 8 })
      );
      if (this.matches(lowerDesc, ['terms', 'agree'])) {
        fields.push(this.createField('agree_terms', 'checkbox', 'I agree to the terms and conditions', true));
      }
    } else if (this.matches(lowerDesc, ['survey', 'feedback', 'review'])) {
      title = title || 'Survey Form';
      fields.push(
        this.createField('name', 'text', 'Your Name', false),
        this.createField('rating', 'select', 'Overall Rating', true, undefined, [
          { value: '5', label: '5 - Excellent' },
          { value: '4', label: '4 - Good' },
          { value: '3', label: '3 - Average' },
          { value: '2', label: '2 - Poor' },
          { value: '1', label: '1 - Very Poor' }
        ]),
        this.createField('comments', 'textarea', 'Additional Comments', false, { maxLength: 500 })
      );
    } else if (this.matches(lowerDesc, ['application', 'apply', 'job'])) {
      title = title || 'Application Form';
      fields.push(
        this.createField('full_name', 'text', 'Full Name', true, { minLength: 2 }),
        this.createField('email', 'email', 'Email Address', true),
        this.createField('phone', 'text', 'Phone Number', true),
        this.createField('resume', 'file', 'Upload Resume', true),
        this.createField('cover_letter', 'textarea', 'Cover Letter', false, { maxLength: 2000 })
      );
    } else if (this.matches(lowerDesc, ['order', 'purchase', 'buy', 'checkout'])) {
      title = title || 'Order Form';
      fields.push(
        this.createField('customer_name', 'text', 'Customer Name', true),
        this.createField('email', 'email', 'Email Address', true),
        this.createField('shipping_address', 'textarea', 'Shipping Address', true),
        this.createField('payment_method', 'select', 'Payment Method', true, undefined, [
          { value: 'credit_card', label: 'Credit Card' },
          { value: 'debit_card', label: 'Debit Card' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'bank_transfer', label: 'Bank Transfer' }
        ])
      );
    } else if (this.matches(lowerDesc, ['booking', 'reservation', 'appointment', 'schedule'])) {
      title = title || 'Booking Form';
      fields.push(
        this.createField('name', 'text', 'Full Name', true),
        this.createField('email', 'email', 'Email Address', true),
        this.createField('phone', 'text', 'Phone Number', true),
        this.createField('date', 'date', 'Preferred Date', true),
        this.createField('notes', 'textarea', 'Additional Notes', false)
      );
    } else if (this.matches(lowerDesc, ['refund', 'reimbursement', 'expense', 'bill', 'receipt'])) {
      title = title || 'Refund Request Form';
      fields.push(
        this.createField('employee_name', 'text', 'Employee Name', true),
        this.createField('employee_id', 'text', 'Employee ID', true),
        this.createField('department', 'select', 'Department', true, undefined, [
          { value: 'sales', label: 'Sales' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'engineering', label: 'Engineering' },
          { value: 'hr', label: 'Human Resources' },
          { value: 'finance', label: 'Finance' }
        ]),
        this.createField('expense_date', 'date', 'Expense Date', true),
        this.createField('amount', 'text', 'Amount', true, { pattern: '^[0-9]+(\\.[0-9]{1,2})?$' }),
        this.createField('category', 'select', 'Expense Category', true, undefined, [
          { value: 'travel', label: 'Travel' },
          { value: 'accommodation', label: 'Accommodation' },
          { value: 'meals', label: 'Meals' },
          { value: 'transport', label: 'Transportation' },
          { value: 'other', label: 'Other' }
        ]),
        this.createField('description', 'textarea', 'Description', true, { minLength: 10 }),
        this.createField('receipt', 'file', 'Upload Receipt', true)
      );
    } else {
      title = title || 'Custom Form';
      
      if (this.matches(lowerDesc, ['name', 'full name', 'first name', 'last name'])) {
        fields.push(this.createField('name', 'text', 'Name', true));
      }
      if (this.matches(lowerDesc, ['email', 'e-mail'])) {
        fields.push(this.createField('email', 'email', 'Email Address', true));
      }
      if (this.matches(lowerDesc, ['phone', 'telephone', 'mobile', 'contact number'])) {
        fields.push(this.createField('phone', 'text', 'Phone Number', false));
      }
      if (this.matches(lowerDesc, ['address', 'location', 'street'])) {
        fields.push(this.createField('address', 'textarea', 'Address', false));
      }
      if (this.matches(lowerDesc, ['date', 'when'])) {
        fields.push(this.createField('date', 'date', 'Date', false));
      }
      if (this.matches(lowerDesc, ['message', 'comment', 'note', 'description'])) {
        fields.push(this.createField('message', 'textarea', 'Message', false));
      }
      
      if (fields.length === 0) {
        fields.push(
          this.createField('field_1', 'text', 'Field 1', true),
          this.createField('field_2', 'text', 'Field 2', false),
          this.createField('notes', 'textarea', 'Notes', false)
        );
      }
    }

    const schema: FormSchema = {
      id: this.generateId(),
      title,
      description: `Generated by Emulated AI based on: "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"`,
      fields,
      layout: 'vertical',
      theme: 'light',
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'emulated-ai-v1',
        cached: false,
        version: '1.0'
      }
    };

    logger.info('Emulated AI form generated', { 
      title: schema.title, 
      fieldCount: fields.length 
    });

    return schema;
  }

  private matches(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private extractTitle(description: string): string {
    const sentences = description.split(/[.!?]/);
    if (sentences.length > 0 && sentences[0].length < 100) {
      return sentences[0].trim().replace(/^(create|make|build|generate)\s+/i, '');
    }
    return '';
  }

  private createField(
    name: string,
    type: string,
    label: string,
    required: boolean,
    validation?: any,
    options?: any[]
  ): any {
    const field: any = {
      name,
      type,
      label,
      required
    };

    if (type === 'text' || type === 'email' || type === 'password') {
      field.placeholder = `Enter ${label.toLowerCase()}`;
    } else if (type === 'textarea') {
      field.placeholder = `Enter ${label.toLowerCase()}...`;
    }

    if (validation) {
      field.validation = validation;
    }

    if (options) {
      field.options = options;
    }

    return field;
  }

  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `form_emulated_${timestamp}_${random}`;
  }
}
