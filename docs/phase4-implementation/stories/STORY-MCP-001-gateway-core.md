# STORY-MCP-001: MCP Gateway Core

**Sprint**: 1  
**Points**: 8  
**Priority**: P0 (Must Have)  
**Owner**: Developer Agent  
**Status**: Not Started  
**Dependencies**: None

---

## Context

### PRD Reference (Embedded)

From `/docs/phase2-planning/prd.md`:

> **FR-6: API Requirements**
> 
> **FR-6.1**: System SHALL provide REST API for form generation  
> **FR-6.2**: System SHALL provide REST API for form submission  
> **FR-6.3**: System SHALL provide REST API for form retrieval  
> **FR-6.4**: System SHALL authenticate API requests  
> **FR-6.5**: System SHALL rate limit API requests (100 requests per 15 minutes per user)  
> **FR-6.6**: System SHALL version APIs (v1)  
> **FR-6.7**: System SHALL return standard HTTP status codes  
> **FR-6.8**: System SHALL provide detailed error responses

### Architecture Reference (Embedded)

From `/docs/ARCHITECTURE_PLAN.md`:

> **MCP Gateway**
> 
> **Responsibilities**:
> - Load and manage MCP server configurations
> - Route requests to appropriate servers
> - Handle mock/live mode switching
> - Validate requests against JSON Schemas
> - Compile web components (for coder models)
> - Manage authentication (in live mode)
> 
> **Configuration File**: `config/servers.mcp.json`
> 
> ```json
> {
>   "servers": [
>     {
>       "id": "invoice",
>       "name": "Invoice Submission",
>       "description": "Submit and track expense invoices",
>       "mode": "mock",
>       "baseUrl": "https://api.company.com/invoices",
>       "mockBaseUrl": "/mock/invoices",
>       "auth": { "type": "none" },
>       "operations": [...],
>       "workflow": {...}
>     }
>   ]
> }
> ```

---

## Requirements

### Functional Requirements

- [ ] Load MCP server configurations from `config/servers.mcp.json`
- [ ] Discover all available MCP servers on initialization
- [ ] Route requests to correct server based on server ID
- [ ] Support mock/live mode switching per server
- [ ] Validate request payloads against JSON schemas
- [ ] Return server capabilities (resources, tools, prompts)
- [ ] Handle server not found errors
- [ ] Handle invalid payload errors

### Non-Functional Requirements

- [ ] Gateway initialization < 100ms
- [ ] Request routing latency < 50ms
- [ ] Configuration hot-reload support
- [ ] Thread-safe for concurrent requests
- [ ] Comprehensive error logging

---

## Implementation

### Files to Create

1. **`src/backend/services/mcp-gateway.service.ts`** (Main service)
2. **`config/servers.mcp.json`** (Server configurations)
3. **`src/backend/models/mcp-server.model.ts`** (TypeScript interfaces)
4. **`src/backend/services/mcp-gateway.service.spec.ts`** (Unit tests)

### Code Structure

**`src/backend/models/mcp-server.model.ts`**:
```typescript
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
```

**`src/backend/services/mcp-gateway.service.ts`**:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import Ajv from 'ajv';
import { MCPServer, MCPOperation, MCPCapabilities } from '../models/mcp-server.model';

@Injectable()
export class MCPGatewayService {
  private readonly logger = new Logger(MCPGatewayService.name);
  private servers: Map<string, MCPServer> = new Map();
  private ajv: Ajv;
  private initialized = false;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Initialize the MCP Gateway by loading server configurations
   */
  async initialize(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'config', 'servers.mcp.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      // Load all servers
      for (const serverConfig of config.servers) {
        this.servers.set(serverConfig.id, serverConfig);
        this.logger.log(`Loaded MCP server: ${serverConfig.id} (${serverConfig.name})`);
      }

      this.initialized = true;
      this.logger.log(`MCP Gateway initialized with ${this.servers.size} servers`);
    } catch (error) {
      this.logger.error('Failed to initialize MCP Gateway', error);
      throw new Error('MCP Gateway initialization failed');
    }
  }

  /**
   * Get all available MCP servers
   */
  getServers(): MCPServer[] {
    this.ensureInitialized();
    return Array.from(this.servers.values());
  }

  /**
   * Get a specific MCP server by ID
   */
  getServer(serverId: string): MCPServer {
    this.ensureInitialized();
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server not found: ${serverId}`);
    }
    return server;
  }

  /**
   * Get server capabilities (resources, tools, prompts)
   */
  getCapabilities(serverId: string): MCPCapabilities & { requirements?: any } {
    const server = this.getServer(serverId);
    return {
      resources: true,
      tools: true,
      prompts: true,
      requirements: server.workflow,
    };
  }

  /**
   * Validate a payload against the server's input schema
   */
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
      // No schema defined, consider valid
      return { valid: true };
    }

    // Load and validate against JSON schema
    try {
      const schemaPath = path.join(
        process.cwd(),
        'config',
        'schemas',
        operation.inputSchema,
      );
      const schemaData = await fs.readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaData);

      const validate = this.ajv.compile(schema);
      const valid = validate(payload);

      if (!valid) {
        return {
          valid: false,
          errors: validate.errors,
        };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error(`Schema validation error: ${error.message}`);
      throw new Error('Schema validation failed');
    }
  }

  /**
   * Call an MCP server operation
   */
  async call(
    serverId: string,
    operationId: string,
    payload: any,
  ): Promise<any> {
    const server = this.getServer(serverId);
    const operation = server.operations.find((op) => op.id === operationId);

    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    // Validate payload first
    const validation = await this.validate(serverId, operationId, payload);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // Route to mock or live API based on server mode
    if (server.mode === 'mock') {
      return this.callMockAPI(server, operation, payload);
    } else {
      return this.callLiveAPI(server, operation, payload);
    }
  }

  /**
   * Call mock API (local implementation)
   */
  private async callMockAPI(
    server: MCPServer,
    operation: MCPOperation,
    payload: any,
  ): Promise<any> {
    // Import and call the mock API handler
    const mockModule = await import(`../mcp/${server.id}/mock-api`);
    const handler = mockModule[operation.id];

    if (!handler) {
      throw new Error(`Mock handler not found: ${operation.id}`);
    }

    return handler(payload);
  }

  /**
   * Call live API (external service)
   */
  private async callLiveAPI(
    server: MCPServer,
    operation: MCPOperation,
    payload: any,
  ): Promise<any> {
    // Make HTTP request to live API
    const url = `${server.baseUrl}${operation.path}`;
    
    // TODO: Implement HTTP client with auth
    throw new Error('Live API not implemented yet');
  }

  /**
   * Ensure gateway is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MCP Gateway not initialized. Call initialize() first.');
    }
  }
}
```

**`config/servers.mcp.json`**:
```json
{
  "servers": [
    {
      "id": "invoice",
      "name": "Invoice Submission",
      "description": "Submit and track expense invoices",
      "mode": "mock",
      "baseUrl": "https://api.company.com/invoices",
      "mockBaseUrl": "/mock/invoices",
      "auth": {
        "type": "none"
      },
      "operations": [
        {
          "id": "submit",
          "method": "POST",
          "path": "/submit",
          "inputSchema": "invoice-submit.request.json",
          "outputSchema": "invoice-submit.response.json",
          "description": "Submit a new invoice for approval"
        },
        {
          "id": "status",
          "method": "GET",
          "path": "/status/:id",
          "outputSchema": "invoice-status.response.json",
          "description": "Get invoice status"
        }
      ],
      "workflow": {
        "steps": ["DRAFT", "SUBMITTED", "MANAGER_APPROVED", "FINANCE_APPROVED", "REIMBURSED"],
        "requiredFields": ["date", "amount", "currency", "purpose", "category"]
      }
    },
    {
      "id": "travel",
      "name": "Travel Booking",
      "description": "Book business travel (flights, hotels, etc.)",
      "mode": "mock",
      "baseUrl": "https://api.company.com/travel",
      "mockBaseUrl": "/mock/travel",
      "auth": {
        "type": "none"
      },
      "operations": [
        {
          "id": "book",
          "method": "POST",
          "path": "/book",
          "inputSchema": "travel-book.request.json",
          "outputSchema": "travel-book.response.json",
          "description": "Create a travel booking"
        }
      ],
      "workflow": {
        "steps": ["DRAFT", "SUBMITTED", "APPROVED", "BOOKED"],
        "requiredFields": ["destination", "startDate", "endDate", "travelers"]
      }
    }
  ]
}
```

### Existing Code Patterns

From `src/backend/services/langchain.service.ts`:
```typescript
// Service initialization pattern
constructor() {
  this.logger = new Logger(LangChainService.name);
  // Initialize resources
}

// Error handling pattern
try {
  // Operation
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new Error('User-friendly error message');
}
```

From `src/backend/services/cache.service.ts`:
```typescript
// Map-based storage pattern
private cache: Map<string, CacheEntry> = new Map();

// Initialization check pattern
private ensureInitialized(): void {
  if (!this.initialized) {
    throw new Error('Service not initialized');
  }
}
```

---

## Testing

### Unit Tests (`src/backend/services/mcp-gateway.service.spec.ts`)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MCPGatewayService } from './mcp-gateway.service';

describe('MCPGatewayService', () => {
  let service: MCPGatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MCPGatewayService],
    }).compile();

    service = module.get<MCPGatewayService>(MCPGatewayService);
    await service.initialize();
  });

  describe('Server Discovery', () => {
    it('should load all MCP servers from config', () => {
      const servers = service.getServers();
      expect(servers).toHaveLength(2);
      expect(servers.map(s => s.id)).toContain('invoice');
      expect(servers.map(s => s.id)).toContain('travel');
    });

    it('should return server by ID', () => {
      const server = service.getServer('invoice');
      expect(server.id).toBe('invoice');
      expect(server.name).toBe('Invoice Submission');
    });

    it('should throw error for non-existent server', () => {
      expect(() => service.getServer('nonexistent')).toThrow('MCP server not found');
    });
  });

  describe('Server Capabilities', () => {
    it('should return capabilities for invoice server', () => {
      const caps = service.getCapabilities('invoice');
      expect(caps.resources).toBe(true);
      expect(caps.tools).toBe(true);
      expect(caps.prompts).toBe(true);
      expect(caps.requirements).toBeDefined();
      expect(caps.requirements.requiredFields).toContain('amount');
    });
  });

  describe('Request Validation', () => {
    it('should validate valid invoice payload', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'USD',
        purpose: 'Client lunch',
        category: 'meals',
      };

      const result = await service.validate('invoice', 'submit', payload);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid invoice payload', async () => {
      const payload = {
        // Missing required fields
        amount: 45.50,
      };

      const result = await service.validate('invoice', 'submit', payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Request Routing', () => {
    it('should route to mock API in mock mode', async () => {
      const payload = {
        date: '2025-12-04',
        amount: 45.50,
        currency: 'USD',
        purpose: 'Client lunch',
        category: 'meals',
      };

      const result = await service.call('invoice', 'submit', payload);
      expect(result.invoiceId).toMatch(/^INV-/);
      expect(result.status).toBe('PENDING_MANAGER');
    });

    it('should throw error for invalid operation', async () => {
      await expect(
        service.call('invoice', 'nonexistent', {})
      ).rejects.toThrow('Operation not found');
    });
  });
});
```

### Integration Tests

```typescript
describe('MCPGateway Integration', () => {
  it('should complete full invoice submission flow', async () => {
    // 1. Get server capabilities
    const caps = gateway.getCapabilities('invoice');
    expect(caps.requirements.requiredFields).toContain('amount');

    // 2. Validate payload
    const payload = { /* valid payload */ };
    const validation = await gateway.validate('invoice', 'submit', payload);
    expect(validation.valid).toBe(true);

    // 3. Submit invoice
    const result = await gateway.call('invoice', 'submit', payload);
    expect(result.invoiceId).toBeTruthy();
  });
});
```

---

## Acceptance Criteria

- [ ] Gateway loads 2 servers (invoice, travel) from config
- [ ] Gateway returns correct server by ID
- [ ] Gateway returns server capabilities
- [ ] Gateway validates payloads against JSON schemas
- [ ] Gateway routes to mock API in mock mode
- [ ] Gateway throws appropriate errors for invalid inputs
- [ ] All unit tests pass (> 90% coverage)
- [ ] Integration tests pass
- [ ] Code follows existing patterns
- [ ] TypeScript types are complete
- [ ] Error logging is comprehensive

---

## Definition of Done

- [ ] Code complete and follows TypeScript best practices
- [ ] All unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Code coverage > 90%
- [ ] Code reviewed by Architect
- [ ] Documentation updated (inline comments)
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Deployed to development environment
- [ ] Manual testing complete

---

## Notes

- This is the foundation for all MCP integration
- Must be completed before STORY-MCP-002 (Invoice Mock API)
- Configuration file format follows Anthropic MCP specification
- Mock API handlers will be implemented in separate stories
- Live API integration is out of scope for Sprint 1

---

**Related Stories**:
- STORY-MCP-002: Invoice Mock API (depends on this)
- STORY-AGENT-002: Agent Tools (will use this gateway)
