import * as ts from 'typescript';
import * as crypto from 'crypto';
import { ComponentSource, CompiledComponent, ComponentValidationResult, ComponentCompilerConfig } from '../models/component.model';

export class ComponentCompilerService {
  private readonly config: ComponentCompilerConfig = {
    enableSandbox: true,
    allowedAPIs: ['console.log', 'console.error', 'console.warn'],
    maxComponentSize: 100 * 1024, // 100KB
    timeout: 5000, // 5 seconds
  };

  async compile(source: ComponentSource): Promise<CompiledComponent> {
    try {
      const validation = this.validate(source);
      if (!validation.valid) {
        throw new Error(`Component validation failed: ${validation.errors?.join(', ')}`);
      }

      this.parseTypeScript(source.typescript);

      const javascript = this.compileTypeScript(source.typescript);

      const processedTemplate = this.processTemplate(source.template);

      const processedStyles = this.processStyles(source.styles);

      const bundled = this.bundleComponent(javascript, processedTemplate, processedStyles, source.metadata);

      const hash = this.generateHash(bundled);

      return {
        javascript: bundled,
        metadata: source.metadata || { selector: 'app-dynamic' },
        hash,
        compiledAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Component compilation failed:', error);
      throw new Error(`Compilation failed: ${error.message}`);
    }
  }

  validate(source: ComponentSource): ComponentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityIssues: string[] = [];

    const totalSize = source.typescript.length + source.template.length + source.styles.length;
    if (totalSize > this.config.maxComponentSize) {
      errors.push(`Component size (${totalSize} bytes) exceeds maximum (${this.config.maxComponentSize} bytes)`);
    }

    const dangerousPatterns = [
      { pattern: /eval\s*\(/gi, issue: 'eval() is not allowed' },
      { pattern: /Function\s*\(/gi, issue: 'Function constructor is not allowed' },
      { pattern: /innerHTML\s*=/gi, issue: 'innerHTML assignment is not allowed (XSS risk)' },
      { pattern: /outerHTML\s*=/gi, issue: 'outerHTML assignment is not allowed (XSS risk)' },
      { pattern: /document\.write/gi, issue: 'document.write is not allowed' },
      { pattern: /<script/gi, issue: 'Script tags are not allowed in templates' },
      { pattern: /javascript:/gi, issue: 'javascript: protocol is not allowed' },
    ];

    for (const { pattern, issue } of dangerousPatterns) {
      if (pattern.test(source.typescript) || pattern.test(source.template)) {
        securityIssues.push(issue);
      }
    }

    try {
      ts.createSourceFile('temp.ts', source.typescript, ts.ScriptTarget.ES2020, true);
    } catch (error: any) {
      errors.push(`TypeScript syntax error: ${error.message}`);
    }

    if (!source.template || source.template.trim().length === 0) {
      warnings.push('Template is empty');
    }

    const valid = errors.length === 0 && securityIssues.length === 0;

    return {
      valid,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      securityIssues: securityIssues.length > 0 ? securityIssues : undefined,
    };
  }

  private parseTypeScript(typescript: string): any {
    const sourceFile = ts.createSourceFile(
      'component.ts',
      typescript,
      ts.ScriptTarget.ES2020,
      true
    );

    return {
      sourceFile,
      hasErrors: false,
    };
  }

  private compileTypeScript(typescript: string): string {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    };

    const result = ts.transpileModule(typescript, {
      compilerOptions,
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      const errors = result.diagnostics.map(d => d.messageText).join(', ');
      throw new Error(`TypeScript compilation errors: ${errors}`);
    }

    return result.outputText;
  }

  private processTemplate(template: string): string {
    let processed = template;

    processed = processed.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    processed = processed.replace(/on\w+\s*=/gi, 'data-blocked-$&');

    return processed;
  }

  private processStyles(styles: string): string {
    let processed = styles;

    processed = processed.replace(/@import\s+[^;]+;/gi, '');

    processed = processed.replace(/url\s*\(\s*['"]?javascript:/gi, 'url(blocked:');

    return processed;
  }

  private bundleComponent(javascript: string, template: string, styles: string, metadata?: any): string {
    const bundle = `
(function() {
  'use strict';
  
  const metadata = ${JSON.stringify(metadata || {})};
  const template = ${JSON.stringify(template)};
  const styles = ${JSON.stringify(styles)};
  
  ${javascript}
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { metadata, template, styles };
  }
})();
`;

    return bundle;
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}
