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
      required: formData.requiredFields || [],
    };

    for (const field of formData.fields || []) {
      (schema.properties as any)[field] = {
        type: 'string',
        title: this.formatFieldName(field),
      };
    }

    return {
      mode: OutputMode.JSON_SCHEMA,
      schema,
    };
  }

  private async generateWebComponent(formData: any): Promise<any> {
    const componentSource: ComponentSource = {
      typescript: this.generateComponentTypeScript(formData),
      template: '',
      styles: '',
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
    const fields = formData.fields || [];
    const title = formData.title || 'Generated Form';
    const description = formData.description || '';

    return `
class GeneratedFormComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.formData = {};
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const template = \\\`
      <style>
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
        .form-field input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .form-field input:focus {
          outline: none;
          border-color: #4CAF50;
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
      </style>
      <div class="generated-form">
        <h2>\\\${title}</h2>
        \\\${description ? \\\`<p>\\\${description}</p>\\\` : ''}
        <form id="dynamicForm">
          \\\${fields.map((f) => \\\`
            <div class="form-field">
              <label for="\\\${f}">\\\${this.formatFieldName(f)}</label>
              <input type="text" id="\\\${f}" name="\\\${f}" placeholder="Enter \\\${this.formatFieldName(f).toLowerCase()}">
            </div>
          \\\`).join('')}
          <button type="submit" class="submit-btn">Submit</button>
        </form>
      </div>
    \\\`;
    this.shadowRoot.innerHTML = template;
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

  private generateComponentTemplate(formData: any): string {
    const fields = formData.fields || [];
    const fieldInputs = fields.map((f: string) => `
    <div class="form-field">
      <label for="${f}">${this.formatFieldName(f)}</label>
      <input 
        id="${f}" 
        type="text" 
        [(ngModel)]="${f}" 
        placeholder="Enter ${this.formatFieldName(f).toLowerCase()}"
      />
    </div>
`).join('');

    return `
<div class="generated-form">
  <h2>${formData.title || 'Generated Form'}</h2>
  <p>${formData.description || ''}</p>
  
  <form (ngSubmit)="onSubmit()">
${fieldInputs}
    
    <button type="submit" class="submit-btn">Submit</button>
  </form>
</div>
`;
  }

  private generateComponentStyles(_formData: any): string {
    return `
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

.form-field input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-field input:focus {
  outline: none;
  border-color: #4CAF50;
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
`;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
