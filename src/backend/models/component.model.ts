export interface ComponentSource {
  typescript: string;
  template: string;
  styles: string;
  metadata?: ComponentMetadata;
}

export interface ComponentMetadata {
  selector: string;
  inputs?: string[];
  outputs?: string[];
  dependencies?: string[];
}

export interface CompiledComponent {
  javascript: string;
  metadata: ComponentMetadata;
  hash: string;
  compiledAt: string;
}

export interface ComponentValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  securityIssues?: string[];
}

export interface ComponentCompilerConfig {
  enableSandbox: boolean;
  allowedAPIs: string[];
  maxComponentSize: number;
  timeout: number;
}
