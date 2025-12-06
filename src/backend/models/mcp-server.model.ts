export interface MCPServer {
  id: string;
  name: string;
  description: string;
  mode: 'mock' | 'live';
  baseUrl: string;
  mockBaseUrl: string;
  auth: {
    type: 'none' | 'bearer' | 'api-key';
    config?: Record<string, any>;
  };
  operations: MCPOperation[];
  workflow?: MCPWorkflow;
  formTemplate?: any;
  formSchema?: MCPFormSchema;
}

export interface MCPOperation {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  inputSchema?: string;
  outputSchema?: string;
  description?: string;
}

export interface MCPWorkflow {
  steps: string[];
  requiredFields: string[];
  prompts?: {
    he: string[];
    en: string[];
  };
}

export interface MCPFormField {
  name: string;
  label: string;
  labelHe?: string;
  type: 'text' | 'textarea' | 'select' | 'file' | 'number' | 'date' | 'email';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string; labelHe?: string }>;
  accept?: string;
  source?: 'user_input' | 'internal_api' | 'internal_api_or_manual' | 'ocr';
  multiple?: boolean;
}

export interface MCPFormSchema {
  fields: MCPFormField[];
}

export interface MCPCapabilities {
  resources: boolean;
  tools: boolean;
  prompts: boolean;
}
