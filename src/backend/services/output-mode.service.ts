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
    'ZHUI/GLM-4-32B-0414:featherless-ai': OutputMode.JSON_SCHEMA,
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
      template: this.generateComponentTemplate(formData),
      styles: this.generateComponentStyles(formData),
      metadata: {
        selector: 'app-generated-form',
        inputs: ['data'],
        outputs: ['submit'],
      },
    };

    const compiled = await this.compiler.compile(componentSource);

    return {
      mode: OutputMode.WEB_COMPONENT,
      component: compiled,
    };
  }

  private generateComponentTypeScript(formData: any): string {
    const fields = formData.fields || [];
    const fieldProperties = fields.map((f: string) => `  ${f}: string = '';`).join('\n');

    return `
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-generated-form',
  templateUrl: './generated-form.component.html',
  styleUrls: ['./generated-form.component.css']
})
export class GeneratedFormComponent {
  @Input() data: any;
  @Output() submit = new EventEmitter<any>();

${fieldProperties}

  onSubmit(): void {
    const formData = {
${fields.map((f: string) => `      ${f}: this.${f},`).join('\n')}
    };
    this.submit.emit(formData);
  }
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

  private generateComponentStyles(formData: any): string {
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
