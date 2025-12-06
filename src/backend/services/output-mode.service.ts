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
    const schema = {
      type: 'object',
      title: formData.title || 'Generated Form',
      description: formData.description || '',
      properties: {},
      required: [] as string[],
    };

    for (const field of formData.fields || []) {
      const fieldName = typeof field === 'string' ? field : field.name;
      const fieldLabel = typeof field === 'string' ? this.formatFieldName(field) : (field.label || this.formatFieldName(field.name));
      const fieldType = typeof field === 'string' ? 'string' : this.mapFieldTypeToJsonSchema(field.type || 'text');
      const fieldRequired = typeof field === 'string' ? false : (field.required || false);
      
      (schema.properties as any)[fieldName] = {
        type: fieldType,
        title: fieldLabel,
      };
      
      if (fieldRequired) {
        schema.required.push(fieldName);
      }
    }

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
      .generated-form {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        font-family: Arial, sans-serif;
      }
      .generated-form h2 {
        color: #333;
        margin-bottom: 10px;
      }
      .generated-form p {
        color: #666;
        margin-bottom: 20px;
      }
      .form-field {
        margin-bottom: 15px;
      }
      .form-field label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: #555;
      }
      .form-field input,
      .form-field textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .form-field input:focus,
      .form-field textarea:focus {
        outline: none;
        border-color: #4CAF50;
      }
      .form-field textarea {
        resize: vertical;
        min-height: 80px;
      }
      .submit-btn {
        background-color: #4CAF50;
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        width: 100%;
      }
      .submit-btn:hover {
        background-color: #45a049;
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
