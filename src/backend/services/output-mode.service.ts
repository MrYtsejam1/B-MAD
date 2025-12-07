import { ComponentCompilerService } from './component-compiler.service';
import { ComponentSource } from '../models/component.model';

export enum OutputMode {
  JSON_SCHEMA = 'json_schema',
  WEB_COMPONENT = 'web_component',
}

export interface OutputModeConfig {
  mode: OutputMode;
  model: string;
}

export class OutputModeService {
  private compiler: ComponentCompilerService;
  
  private readonly modelModeMap: Record<string, OutputMode> = {
    'zai-org/GLM-4-32B-0414:featherless-ai': OutputMode.JSON_SCHEMA,
    'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai': OutputMode.WEB_COMPONENT,
    'agentica-org/DeepCoder-14B-Preview:featherless-ai': OutputMode.WEB_COMPONENT,
  };

  constructor() {
    this.compiler = new ComponentCompilerService();
  }

  getOutputMode(model: string): OutputMode {
    return this.modelModeMap[model] || OutputMode.JSON_SCHEMA;
  }

  async generateOutput(config: OutputModeConfig, formData: any): Promise<any> {
    if (config.mode === OutputMode.JSON_SCHEMA) {
      return this.generateJSONSchema(formData);
    } else {
      return this.generateWebComponent(formData);
    }
  }

  private generateJSONSchema(formData: any): any {
    const rawFields = formData.fields || [];
    const fields = Array.isArray(rawFields) ? rawFields : [];
    
    const schema = {
      type: 'object',
      title: formData.title || 'Generated Form',
      description: formData.description || '',
      properties: {},
      required: [] as string[],
      // Include fields array for frontend compatibility
      fields: [] as Array<{ 
        name: string; 
        label: string; 
        labelHe?: string;
        type: string; 
        required: boolean; 
        placeholder: string;
        options?: Array<{ value: string; label: string; labelHe?: string }>;
        accept?: string;
        source?: string;
        multiple?: boolean;
      }>,
    };

    for (const field of fields) {
      const fieldName = typeof field === 'string' ? field : field.name;
      const fieldLabel = typeof field === 'string' ? this.formatFieldName(field) : (field.label || this.formatFieldName(field.name));
      const fieldLabelHe = typeof field === 'string' ? undefined : field.labelHe;
      const fieldType = typeof field === 'string' ? 'text' : (field.type || 'text');
      const fieldRequired = typeof field === 'string' ? false : (field.required || false);
      const fieldPlaceholder = typeof field === 'string' ? `Enter ${this.formatFieldName(field).toLowerCase()}` : (field.placeholder || '');
      const fieldOptions = typeof field === 'string' ? undefined : field.options;
      const fieldAccept = typeof field === 'string' ? undefined : field.accept;
      const fieldSource = typeof field === 'string' ? undefined : field.source;
      const fieldMultiple = typeof field === 'string' ? undefined : field.multiple;
      
      const propertyDef: any = {
        type: this.mapFieldTypeToJsonSchema(fieldType),
        title: fieldLabel,
      };
      
      // Add enum for select fields
      if (fieldType === 'select' && fieldOptions) {
        propertyDef.enum = fieldOptions.map((opt: any) => opt.value);
        propertyDef.enumLabels = fieldOptions.map((opt: any) => opt.label);
      }
      
      (schema.properties as any)[fieldName] = propertyDef;
      
      // Add to fields array for frontend form rendering
      const fieldDef: any = {
        name: fieldName,
        label: fieldLabel,
        type: fieldType,
        required: fieldRequired,
        placeholder: fieldPlaceholder,
      };
      
      // Add optional properties if they exist
      if (fieldLabelHe) fieldDef.labelHe = fieldLabelHe;
      if (fieldOptions) fieldDef.options = fieldOptions;
      if (fieldAccept) fieldDef.accept = fieldAccept;
      if (fieldSource) fieldDef.source = fieldSource;
      if (fieldMultiple) fieldDef.multiple = fieldMultiple;
      
      schema.fields.push(fieldDef);
      
      if (fieldRequired) {
        schema.required.push(fieldName);
      }
    }

    console.log('[OutputModeService] Generated JSON schema with fields:', schema.fields);

    return {
      mode: OutputMode.JSON_SCHEMA,
      schema,
    };
  }

  private mapFieldTypeToJsonSchema(type: string): string {
    const typeMap: Record<string, string> = {
      'text': 'string',
      'email': 'string',
      'tel': 'string',
      'url': 'string',
      'textarea': 'string',
      'number': 'number',
      'date': 'string',
    };
    return typeMap[type] || 'string';
  }

  private async generateWebComponent(formData: any): Promise<any> {
    const componentSource: ComponentSource = {
      typescript: this.generateComponentTypeScript(formData),
      template: '<div data-wc-root></div>',
      styles: ':host{display:block;}',
      metadata: {
        selector: 'generated-form-component',
        inputs: [],
        outputs: ['formSubmit'],
      },
    };

    const compiled = await this.compiler.compile(componentSource);

    return {
      mode: OutputMode.WEB_COMPONENT,
      component: {
        javascript: compiled.javascript,
        metadata: compiled.metadata,
        hash: compiled.hash,
        selector: 'generated-form-component',
      },
    };
  }

  private generateComponentTypeScript(formData: any): string {
    const rawFields = formData.fields || [];
    const fields = Array.isArray(rawFields) ? rawFields : [];
    const title = formData.title || 'Generated Form';
    const description = formData.description || '';
    
    console.log('[OutputModeService] Generating web component with fields:', fields);

    return `
class GeneratedFormComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = ${JSON.stringify({ title, description, fields })};
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const { title, description, fields } = this.data;
    
    const style = document.createElement('style');
    style.textContent = \`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      .generated-form {
        max-width: 640px;
        margin: 0 auto;
        padding: 32px 40px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 20px 25px -5px rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(226, 232, 240, 0.8);
      }
      .generated-form h2 {
        color: #1e293b;
        margin-bottom: 8px;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.025em;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .generated-form p {
        color: #64748b;
        margin-bottom: 28px;
        font-size: 15px;
        line-height: 1.6;
      }
      .form-field {
        margin-bottom: 24px;
      }
      .form-field label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
        letter-spacing: 0.01em;
      }
      .form-field label .required {
        color: #ef4444;
        margin-left: 2px;
      }
      .form-field input,
      .form-field textarea,
      .form-field select {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-size: 15px;
        box-sizing: border-box;
        font-family: inherit;
        background: #ffffff;
        color: #1e293b;
        transition: all 0.2s ease;
      }
      .form-field input::placeholder,
      .form-field textarea::placeholder {
        color: #94a3b8;
      }
      .form-field input:hover,
      .form-field textarea:hover,
      .form-field select:hover {
        border-color: #cbd5e1;
      }
      .form-field input:focus,
      .form-field textarea:focus,
      .form-field select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
      }
      .form-field textarea {
        resize: vertical;
        min-height: 100px;
        line-height: 1.5;
      }
      .form-field select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        background-size: 20px;
        padding-right: 44px;
      }
      .form-field input[type="file"] {
        padding: 10px 12px;
        cursor: pointer;
        background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
      }
      .form-field input[type="file"]::-webkit-file-upload-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        margin-right: 12px;
        font-size: 13px;
        transition: opacity 0.2s;
      }
      .form-field input[type="file"]::-webkit-file-upload-button:hover {
        opacity: 0.9;
      }
      .form-field input[type="date"] {
        cursor: pointer;
      }
      .submit-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 14px 28px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        width: 100%;
        margin-top: 8px;
        transition: all 0.2s ease;
        box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.35);
        letter-spacing: 0.02em;
      }
      .submit-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px 0 rgba(102, 126, 234, 0.45);
      }
      .submit-btn:active {
        transform: translateY(0);
      }
    \`;
    
    const container = document.createElement('div');
    container.className = 'generated-form';
    
    const h2 = document.createElement('h2');
    h2.textContent = title;
    container.appendChild(h2);
    
    if (description) {
      const p = document.createElement('p');
      p.textContent = description;
      container.appendChild(p);
    }
    
    const form = document.createElement('form');
    form.id = 'dynamicForm';
    
    fields.forEach(field => {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'form-field';
      
      const fieldName = typeof field === 'string' ? field : field.name;
      const fieldLabel = typeof field === 'string' ? this.formatFieldName(field) : (field.label || this.formatFieldName(field.name));
      const fieldType = typeof field === 'string' ? 'text' : (field.type || 'text');
      const fieldRequired = typeof field === 'string' ? false : (field.required || false);
      const fieldPlaceholder = typeof field === 'string' ? ('Enter ' + this.formatFieldName(field).toLowerCase()) : (field.placeholder || '');
      
      const label = document.createElement('label');
      label.setAttribute('for', fieldName);
      label.textContent = fieldLabel;
      if (fieldRequired) {
        label.textContent += ' *';
      }
      fieldDiv.appendChild(label);
      
      if (fieldType === 'textarea') {
        const textarea = document.createElement('textarea');
        textarea.id = fieldName;
        textarea.name = fieldName;
        textarea.placeholder = fieldPlaceholder;
        textarea.required = fieldRequired;
        textarea.rows = 4;
        textarea.style.width = '100%';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid #ddd';
        textarea.style.borderRadius = '4px';
        textarea.style.fontSize = '14px';
        textarea.style.boxSizing = 'border-box';
        textarea.style.fontFamily = 'Arial, sans-serif';
        fieldDiv.appendChild(textarea);
      } else {
        const input = document.createElement('input');
        input.type = fieldType;
        input.id = fieldName;
        input.name = fieldName;
        input.placeholder = fieldPlaceholder;
        input.required = fieldRequired;
        fieldDiv.appendChild(input);
      }
      
      form.appendChild(fieldDiv);
    });
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'submit-btn';
    submitBtn.textContent = 'Submit';
    form.appendChild(submitBtn);
    
    container.appendChild(form);
    
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(container);
  }

  formatFieldName(field) {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  attachEventListeners() {
    const form = this.shadowRoot.getElementById('dynamicForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      this.dispatchEvent(new CustomEvent('formSubmit', { 
        detail: data,
        bubbles: true,
        composed: true
      }));
      console.log('Form submitted:', data);
    });
  }
}

if (!customElements.get('generated-form-component')) {
  customElements.define('generated-form-component', GeneratedFormComponent);
}
`;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
