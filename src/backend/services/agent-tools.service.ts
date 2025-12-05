import { MCPGatewayService } from './mcp-gateway.service';
import { OCRService } from './ocr.service';
import { NLPService } from './nlp.service';
import { AgentTool } from '../models/agent.model';

export class AgentToolsService {
  private mcpGateway: MCPGatewayService;
  private ocrService: OCRService;
  private nlpService: NLPService;

  constructor() {
    this.mcpGateway = new MCPGatewayService();
    this.ocrService = new OCRService();
    this.nlpService = new NLPService();
  }

  async initialize(): Promise<void> {
    await this.mcpGateway.initialize();
  }

  getTools(): AgentTool[] {
    return [
      {
        name: 'mcp.describe',
        description: 'Get capabilities and requirements for an MCP server',
        parameters: {
          serverId: 'string',
        },
        execute: this.mcpDescribe.bind(this),
      },
      {
        name: 'mcp.validate',
        description: 'Validate a payload against MCP server schema',
        parameters: {
          serverId: 'string',
          operationId: 'string',
          payload: 'object',
        },
        execute: this.mcpValidate.bind(this),
      },
      {
        name: 'mcp.call',
        description: 'Call an MCP server operation',
        parameters: {
          serverId: 'string',
          operationId: 'string',
          payload: 'object',
        },
        execute: this.mcpCall.bind(this),
      },
      {
        name: 'ocr.process',
        description: 'Process a receipt image with OCR',
        parameters: {
          imageBuffer: 'Buffer',
          mimeType: 'string',
        },
        execute: this.ocrProcess.bind(this),
      },
      {
        name: 'nlp.extract',
        description: 'Extract invoice data from natural language text',
        parameters: {
          text: 'string',
          context: 'object (optional)',
        },
        execute: this.nlpExtract.bind(this),
      },
    ];
  }

  async mcpDescribe(serverId: string): Promise<any> {
    try {
      const server = this.mcpGateway.getServer(serverId);
      const capabilities = this.mcpGateway.getCapabilities(serverId);

      return {
        id: server.id,
        name: server.name,
        description: server.description,
        mode: server.mode,
        operations: server.operations.map(op => ({
          id: op.id,
          method: op.method,
          path: op.path,
          description: op.description,
        })),
        capabilities,
        requirements: capabilities.requirements,
      };
    } catch (error: any) {
      throw new Error(`Failed to describe MCP server: ${error.message}`);
    }
  }

  async mcpValidate(serverId: string, operationId: string, payload: any): Promise<any> {
    try {
      const result = await this.mcpGateway.validate(serverId, operationId, payload);
      return result;
    } catch (error: any) {
      throw new Error(`Failed to validate payload: ${error.message}`);
    }
  }

  async mcpCall(serverId: string, operationId: string, payload: any): Promise<any> {
    try {
      const result = await this.mcpGateway.call(serverId, operationId, payload);
      return result;
    } catch (error: any) {
      throw new Error(`Failed to call MCP server: ${error.message}`);
    }
  }

  async ocrProcess(imageBuffer: Buffer, mimeType: string, filename?: string): Promise<any> {
    try {
      const result = await this.ocrService.processReceipt({
        imageBuffer,
        mimeType,
        filename,
      });
      return result;
    } catch (error: any) {
      throw new Error(`Failed to process OCR: ${error.message}`);
    }
  }

  async nlpExtract(text: string, context?: any): Promise<any> {
    try {
      const result = await this.nlpService.extractInvoice({
        text,
        context,
      });
      return result;
    } catch (error: any) {
      throw new Error(`Failed to extract NLP data: ${error.message}`);
    }
  }
}
