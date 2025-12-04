/**
 * Form schema models and types
 */

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password'
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'radio' 
  | 'date' 
  | 'file';

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
}

export interface FieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: any;
  action: 'show' | 'hide';
}

export interface FormField {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  defaultValue?: any;
  validation?: ValidationRules;
  options?: FieldOption[];
  conditionalDisplay?: ConditionalLogic;
  attributes?: Record<string, any>;
}

export interface FormMetadata {
  generatedAt: string;
  model: string;
  cached: boolean;
  version: string;
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  layout: 'vertical' | 'horizontal' | 'grid';
  theme: 'light' | 'dark';
  metadata: FormMetadata;
}

export interface GenerationOptions {
  theme?: 'light' | 'dark';
  layout?: 'vertical' | 'horizontal' | 'grid';
  includeSubmitButton?: boolean;
}
