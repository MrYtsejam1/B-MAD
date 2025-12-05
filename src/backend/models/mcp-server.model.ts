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
}

export interface MCPCapabilities {
  resources: boolean;
  tools: boolean;
  prompts: boolean;
}
