export enum OutputMode {
  JSON_SCHEMA = 'json_schema',
  WEB_COMPONENT = 'web_component',
}

export interface OutputModeConfig {
  mode: OutputMode;
  model: string;
}

export class OutputModeService {
  private readonly modelModeMap: Record<string, OutputMode> = {
    'zai-org/GLM-4-32B-0414:featherless-ai': OutputMode.JSON_SCHEMA,
    'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai': OutputMode.WEB_COMPONENT,
    'agentica-org/DeepCoder-14B-Preview:featherless-ai': OutputMode.WEB_COMPONENT,
  };

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
    // Instead of generating and compiling JavaScript (which gets blocked by CSP),
    // we return the form configuration as data. The frontend has a static web component
    // (form-component.js) that renders forms based on this configuration.
    const rawFields = formData.fields || [];
    const fields = Array.isArray(rawFields) ? rawFields : [];
    const title = formData.title || 'Generated Form';
    const description = formData.description || '';
    const data = formData.data || {};

    console.log('[OutputModeService] Generating web component config with fields:', fields);

    return {
      mode: OutputMode.WEB_COMPONENT,
      component: {
        selector: 'generated-form-component',
        fields: fields,
        data: data,
        title: title,
        description: description,
        styles: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          maxWidth: '640px',
          padding: '32px 40px',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          buttonBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          buttonColor: '#ffffff',
        },
      },
    };
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
