import { Injectable, ComponentFactoryResolver, ViewContainerRef, ComponentRef, Type } from '@angular/core';

export interface DynamicComponentData {
  javascript: string;
  metadata: any;
  hash: string;
}

@Injectable({
  providedIn: 'root'
})
export class DynamicLoaderService {
  private loadedComponents: Map<string, Type<any>> = new Map();

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {}

  async loadComponent(
    data: DynamicComponentData,
    container: ViewContainerRef
  ): Promise<ComponentRef<any>> {
    try {
      let componentType = this.loadedComponents.get(data.hash);

      if (!componentType) {
        componentType = await this.compileComponent(data);
        this.loadedComponents.set(data.hash, componentType);
      }

      const componentFactory = this.componentFactoryResolver.resolveComponentFactory(componentType);
      const componentRef = container.createComponent(componentFactory);

      return componentRef;
    } catch (error: any) {
      console.error('Failed to load dynamic component:', error);
      throw new Error(`Component loading failed: ${error.message}`);
    }
  }

  private async compileComponent(data: DynamicComponentData): Promise<Type<any>> {
    const sandbox = this.createSandbox();

    try {
      const componentModule = sandbox.execute(data.javascript);

      const componentClass = this.createComponentClass(componentModule, data.metadata);

      return componentClass;
    } catch (error: any) {
      console.error('Component compilation failed:', error);
      throw error;
    }
  }

  private createSandbox(): any {
    return {
      execute: (code: string): any => {
        const allowedGlobals = {
          console: {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
          },
          JSON,
          Math,
          Date,
        };

        const sandboxedFunction = new Function(
          ...Object.keys(allowedGlobals),
          `'use strict'; ${code}; return module.exports;`
        );

        return sandboxedFunction(...Object.values(allowedGlobals));
      },
    };
  }

  private createComponentClass(componentModule: any, metadata: any): Type<any> {
    class DynamicComponent {
      constructor() {
      }
    }

    Object.defineProperty(DynamicComponent, 'annotations', {
      value: [{
        selector: metadata.selector || 'app-dynamic',
        template: componentModule.template || '<div>Dynamic Component</div>',
        styles: [componentModule.styles || ''],
      }],
    });

    return DynamicComponent as Type<any>;
  }

  unloadComponent(hash: string): void {
    this.loadedComponents.delete(hash);
  }

  clearCache(): void {
    this.loadedComponents.clear();
  }
}
