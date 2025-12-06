import * as fs from 'fs/promises';
import * as path from 'path';
import Ajv from 'ajv';
import { MCPServer, MCPOperation, MCPCapabilities } from '../models/mcp-server.model';

export class MCPGatewayService {
  private servers: Map<string, MCPServer> = new Map();
  private ajv: Ajv;
  private initialized = false;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  async initialize(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'config', 'servers.mcp.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      for (const serverConfig of config.servers) {
        this.servers.set(serverConfig.id, serverConfig);
        console.log(`Loaded MCP server: ${serverConfig.id} (${serverConfig.name})`);
      }

      this.initialized = true;
      console.log(`MCP Gateway initialized with ${this.servers.size} servers`);
    } catch (error) {
      console.error('Failed to initialize MCP Gateway', error);
      throw new Error('MCP Gateway initialization failed');
    }
  }

  getServers(): MCPServer[] {
    this.ensureInitialized();
    return Array.from(this.servers.values());
  }

  getServer(serverId: string): MCPServer {
    this.ensureInitialized();
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server not found: ${serverId}`);
    }
    return server;
  }

  getCapabilities(serverId: string): MCPCapabilities & { requirements?: any; formSchema?: any } {
    const server = this.getServer(serverId);
    return {
      resources: true,
      tools: true,
      prompts: true,
      requirements: server.workflow,
      formSchema: (server as any).formSchema,
    };
  }

  /**
   * Get all MCP servers with their prompts for intent detection
   * Returns a map of server ID to prompts (Hebrew and English keywords)
   */
  getIntentPrompts(): Map<string, { he: string[]; en: string[]; serverId: string; name: string }> {
    this.ensureInitialized();
    const promptsMap = new Map<string, { he: string[]; en: string[]; serverId: string; name: string }>();
    
    for (const [serverId, server] of this.servers) {
      const workflow = (server as any).workflow;
      if (workflow?.prompts) {
        promptsMap.set(serverId, {
          he: workflow.prompts.he || [],
          en: workflow.prompts.en || [],
          serverId,
          name: server.name,
        });
      }
    }
    
    return promptsMap;
  }

  /**
   * Detect which MCP server matches the user input based on prompts
   * Returns the server ID if a match is found, null otherwise
   */
  detectServerFromInput(userInput: string): string | null {
    const promptsMap = this.getIntentPrompts();
    const lowerInput = userInput.toLowerCase();
    
    for (const [serverId, prompts] of promptsMap) {
      // Check Hebrew prompts (case-sensitive for Hebrew)
      for (const hePrompt of prompts.he) {
        if (userInput.includes(hePrompt)) {
          console.log(`[MCPGateway] Matched Hebrew prompt "${hePrompt}" for server ${serverId}`);
          return serverId;
        }
      }
      
      // Check English prompts (case-insensitive)
      for (const enPrompt of prompts.en) {
        if (lowerInput.includes(enPrompt.toLowerCase())) {
          console.log(`[MCPGateway] Matched English prompt "${enPrompt}" for server ${serverId}`);
          return serverId;
        }
      }
    }
    
    return null;
  }

  async validate(
    serverId: string,
    operationId: string,
    payload: any,
  ): Promise<{ valid: boolean; errors?: any[] }> {
    const server = this.getServer(serverId);
    const operation = server.operations.find((op) => op.id === operationId);

    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    if (!operation.inputSchema) {
      return { valid: true };
    }

    try {
      const schemaPath = path.join(process.cwd(), 'config', 'schemas', operation.inputSchema);
      const schemaData = await fs.readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaData);

      const validate = this.ajv.compile(schema);
      const valid = validate(payload);

      if (!valid) {
        return { valid: false, errors: validate.errors ?? undefined };
      }

      return { valid: true };
    } catch (error: any) {
      console.error(`Schema validation error: ${error.message}`);
      throw new Error('Schema validation failed');
    }
  }

  async call(serverId: string, operationId: string, payload: any): Promise<any> {
    const server = this.getServer(serverId);
    const operation = server.operations.find((op) => op.id === operationId);

    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    const validation = await this.validate(serverId, operationId, payload);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    if (server.mode === 'mock') {
      return this.callMockAPI(server, operation, payload);
    } else {
      return this.callLiveAPI(server, operation, payload);
    }
  }

  private async callMockAPI(server: MCPServer, operation: MCPOperation, payload: any): Promise<any> {
    try {
      const mockModule = await import(`../mcp/${server.id}/mock-api`);
      const handler = mockModule[operation.id];

      if (!handler) {
        throw new Error(`Mock handler not found: ${operation.id}`);
      }

      return handler(payload);
    } catch (error: any) {
      console.error(`Mock API call failed: ${error.message}`);
      throw error;
    }
  }

  private async callLiveAPI(_server: MCPServer, _operation: MCPOperation, _payload: any): Promise<any> {
    throw new Error('Live API not implemented yet');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MCP Gateway not initialized. Call initialize() first.');
    }
  }
}
