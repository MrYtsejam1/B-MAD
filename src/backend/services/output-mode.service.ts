import { HfInference } from '@huggingface/inference';

export enum OutputMode {
  JSON_SCHEMA = 'json_schema',
  WEB_COMPONENT = 'web_component',
}

export interface OutputModeConfig {
  mode: OutputMode;
  model: string;
}

export interface EnhancedFormConfig {
  title: string;
  description: string;
  theme: 'modern' | 'minimal' | 'corporate' | 'friendly';
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    collapsed?: boolean;
    fields: string[];
  }>;
  fieldEnhancements: Record<string, {
    hint?: string;
    icon?: string;
    width?: 'full' | 'half' | 'third';
    validation?: string;
  }>;
  styles: {
    primaryColor: string;
    accentColor: string;
    borderRadius: string;
    spacing: 'compact' | 'normal' | 'spacious';
  };
  submitButton: {
    text: string;
    icon?: string;
  };
}

export class OutputModeService {
  private hf: HfInference | null = null;
  
  private readonly modelModeMap: Record<string, OutputMode> = {
    'zai-org/GLM-4-32B-0414:featherless-ai': OutputMode.JSON_SCHEMA,
    'ZHUI/GLM-4-32B-0414:featherless-ai': OutputMode.JSON_SCHEMA,
    'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai': OutputMode.WEB_COMPONENT,
    'agentica-org/DeepCoder-14B-Preview:featherless-ai': OutputMode.WEB_COMPONENT,
  };

  constructor(hfToken?: string) {
    if (hfToken) {
      this.hf = new HfInference(hfToken);
    }
  }

  setHfInference(hf: HfInference): void {
    this.hf = hf;
  }

  getOutputMode(model: string): OutputMode {
    return this.modelModeMap[model] || OutputMode.JSON_SCHEMA;
  }

  async generateOutput(config: OutputModeConfig, formData: any): Promise<any> {
    if (config.mode === OutputMode.JSON_SCHEMA) {
      return this.generateJSONSchema(formData);
    } else {
      return this.generateWebComponent(formData, config.model);
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

  private async generateWebComponent(formData: any, model?: string): Promise<any> {
    const rawFields = formData.fields || [];
    const fields = Array.isArray(rawFields) ? rawFields : [];
    const title = formData.title || 'Generated Form';
    const description = formData.description || '';
    const data = formData.data || {};

    console.log('[OutputModeService] Generating web component config with fields:', fields.map((f: any) => typeof f === 'string' ? f : f.name));

    // Try to get enhanced form design from coder model
    let enhancedConfig: Partial<EnhancedFormConfig> | null = null;
    if (this.hf && model) {
      try {
        enhancedConfig = await this.getEnhancedFormDesign(fields, title, description, model);
        console.log('[OutputModeService] Got enhanced form design from coder model:', enhancedConfig?.theme);
      } catch (error) {
        console.warn('[OutputModeService] Failed to get enhanced form design, using defaults:', error);
      }
    }

    // Build the component config with enhanced design or defaults
    const component: any = {
      selector: 'generated-form-component',
      fields: fields,
      data: data,
      title: enhancedConfig?.title || title,
      description: enhancedConfig?.description || description,
    };

    // Add sections if provided by coder model
    if (enhancedConfig?.sections && enhancedConfig.sections.length > 0) {
      component.sections = enhancedConfig.sections;
    }

    // Add field enhancements (hints, icons, widths)
    if (enhancedConfig?.fieldEnhancements) {
      component.fieldEnhancements = enhancedConfig.fieldEnhancements;
    }

    // Add submit button customization
    if (enhancedConfig?.submitButton) {
      component.submitButton = enhancedConfig.submitButton;
    }

    // Build styles based on theme or use defaults
    component.styles = this.getThemeStyles(enhancedConfig?.theme || 'modern', enhancedConfig?.styles);

    return {
      mode: OutputMode.WEB_COMPONENT,
      component,
    };
  }

  private async getEnhancedFormDesign(
    fields: any[],
    title: string,
    description: string,
    model: string
  ): Promise<Partial<EnhancedFormConfig> | null> {
    if (!this.hf) return null;

    const fieldNames = fields.map((f: any) => typeof f === 'string' ? f : f.name);
    const fieldTypes = fields.map((f: any) => {
      if (typeof f === 'string') return { name: f, type: 'text' };
      return { name: f.name, type: f.type || 'text', label: f.label };
    });

    const prompt = `You are a UI/UX designer. Design a modern, user-friendly form layout for the following form.

Form Title: ${title}
Form Description: ${description}
Fields: ${JSON.stringify(fieldTypes, null, 2)}

Output a JSON object with this exact structure (no markdown, just JSON):
{
  "title": "A clear, user-friendly title",
  "description": "A helpful description for the user",
  "theme": "modern",
  "sections": [
    {
      "id": "section1",
      "title": "Section Title",
      "description": "Optional section description",
      "fields": ["fieldName1", "fieldName2"]
    }
  ],
  "fieldEnhancements": {
    "fieldName": {
      "hint": "Helpful hint for the user",
      "width": "full"
    }
  },
  "styles": {
    "primaryColor": "#667eea",
    "accentColor": "#764ba2",
    "borderRadius": "12px",
    "spacing": "normal"
  },
  "submitButton": {
    "text": "Submit Form"
  }
}

Rules:
- Group related fields into logical sections
- Add helpful hints for fields that might be confusing
- Use "half" width for short fields like dates, "full" for text areas
- Choose a theme: "modern" (gradient), "minimal" (clean), "corporate" (professional), "friendly" (warm colors)
- Keep the design clean and accessible
- Only use field names from the provided list: ${fieldNames.join(', ')}

Output only valid JSON, no explanation:`;

    try {
      const response = await this.hf.chatCompletion({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const content = response.choices?.[0]?.message?.content || '';
      console.log('[OutputModeService] Coder model response:', content.substring(0, 200));

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateEnhancedConfig(parsed, fieldNames);
      }
    } catch (error) {
      console.error('[OutputModeService] Error calling coder model:', error);
    }

    return null;
  }

  private validateEnhancedConfig(config: any, validFieldNames: string[]): Partial<EnhancedFormConfig> {
    const validated: Partial<EnhancedFormConfig> = {};

    if (typeof config.title === 'string') validated.title = config.title;
    if (typeof config.description === 'string') validated.description = config.description;
    if (['modern', 'minimal', 'corporate', 'friendly'].includes(config.theme)) {
      validated.theme = config.theme;
    }

    // Validate sections - only include valid field names
    if (Array.isArray(config.sections)) {
      validated.sections = config.sections
        .filter((s: any) => s && typeof s.id === 'string' && Array.isArray(s.fields))
        .map((s: any) => ({
          id: s.id,
          title: s.title || s.id,
          description: s.description,
          collapsed: s.collapsed || false,
          fields: s.fields.filter((f: string) => validFieldNames.includes(f)),
        }))
        .filter((s: any) => s.fields.length > 0);
    }

    // Validate field enhancements
    if (config.fieldEnhancements && typeof config.fieldEnhancements === 'object') {
      validated.fieldEnhancements = {};
      for (const [fieldName, enhancement] of Object.entries(config.fieldEnhancements)) {
        if (validFieldNames.includes(fieldName) && enhancement && typeof enhancement === 'object') {
          const enh = enhancement as any;
          validated.fieldEnhancements[fieldName] = {
            hint: typeof enh.hint === 'string' ? enh.hint : undefined,
            icon: typeof enh.icon === 'string' ? enh.icon : undefined,
            width: ['full', 'half', 'third'].includes(enh.width) ? enh.width : undefined,
          };
        }
      }
    }

    // Validate styles
    if (config.styles && typeof config.styles === 'object') {
      validated.styles = {
        primaryColor: config.styles.primaryColor || '#667eea',
        accentColor: config.styles.accentColor || '#764ba2',
        borderRadius: config.styles.borderRadius || '12px',
        spacing: ['compact', 'normal', 'spacious'].includes(config.styles.spacing) ? config.styles.spacing : 'normal',
      };
    }

    // Validate submit button
    if (config.submitButton && typeof config.submitButton === 'object') {
      validated.submitButton = {
        text: config.submitButton.text || 'Submit',
        icon: config.submitButton.icon,
      };
    }

    return validated;
  }

  private getThemeStyles(theme: string, customStyles?: EnhancedFormConfig['styles']): any {
    const themes: Record<string, any> = {
      modern: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: '640px',
        padding: '32px 40px',
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: customStyles?.borderRadius || '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        buttonBackground: `linear-gradient(135deg, ${customStyles?.primaryColor || '#667eea'} 0%, ${customStyles?.accentColor || '#764ba2'} 100%)`,
        buttonColor: '#ffffff',
        primaryColor: customStyles?.primaryColor || '#667eea',
        accentColor: customStyles?.accentColor || '#764ba2',
        spacing: customStyles?.spacing || 'normal',
      },
      minimal: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        maxWidth: '600px',
        padding: '24px',
        background: '#ffffff',
        borderRadius: customStyles?.borderRadius || '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        buttonBackground: customStyles?.primaryColor || '#1a1a1a',
        buttonColor: '#ffffff',
        primaryColor: customStyles?.primaryColor || '#1a1a1a',
        accentColor: customStyles?.accentColor || '#666666',
        spacing: customStyles?.spacing || 'compact',
      },
      corporate: {
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        maxWidth: '680px',
        padding: '32px',
        background: '#fafafa',
        borderRadius: customStyles?.borderRadius || '4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
        buttonBackground: customStyles?.primaryColor || '#0066cc',
        buttonColor: '#ffffff',
        primaryColor: customStyles?.primaryColor || '#0066cc',
        accentColor: customStyles?.accentColor || '#004499',
        spacing: customStyles?.spacing || 'normal',
      },
      friendly: {
        fontFamily: "'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: '620px',
        padding: '28px 36px',
        background: 'linear-gradient(145deg, #fff9f0 0%, #ffffff 100%)',
        borderRadius: customStyles?.borderRadius || '20px',
        boxShadow: '0 8px 16px rgba(255, 152, 0, 0.1)',
        buttonBackground: `linear-gradient(135deg, ${customStyles?.primaryColor || '#ff9800'} 0%, ${customStyles?.accentColor || '#f57c00'} 100%)`,
        buttonColor: '#ffffff',
        primaryColor: customStyles?.primaryColor || '#ff9800',
        accentColor: customStyles?.accentColor || '#f57c00',
        spacing: customStyles?.spacing || 'spacious',
      },
    };

    return themes[theme] || themes.modern;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
