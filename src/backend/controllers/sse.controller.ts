import { Request, Response } from 'express';
import { LangChainAgentService } from '../services/langchain-agent.service';
import { AgentEvent } from '../models/agent.model';
import { SessionStartRequest, SessionMessageRequest } from '../models/session.model';
import { componentController } from './component.controller';

export class SSEController {
  private agent: LangChainAgentService;
  private heartbeatInterval = 30000; // 30 seconds

  constructor() {
    this.agent = new LangChainAgentService();
  }

  async startSession(req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    this.sendEvent(res, 'connected', { message: 'Connected to agent stream' });

    const heartbeat = setInterval(() => {
      this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
    }, this.heartbeatInterval);

    req.on('close', () => {
      clearInterval(heartbeat);
      console.log('SSE client disconnected');
    });

    try {
      const { userInput, mode, model, scenario } = req.body;

      if (!userInput) {
        this.sendEvent(res, 'error', { message: 'Missing userInput parameter' });
        res.end();
        return;
      }

      console.log('[SSE] Starting session with model:', model);
      const request: SessionStartRequest = { userInput, mode, model, scenario };

      const result = await this.agent.startSession(
        request,
        (event: AgentEvent) => {
          this.sendEvent(res, event.type, event.data);
        }
      );

      this.sendEvent(res, 'result', result);
      
      clearInterval(heartbeat);
      res.end();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Session start error:', error);
      this.sendEvent(res, 'error', { message: errorMessage });
      clearInterval(heartbeat);
      res.end();
    }
  }

  async continueSession(req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    this.sendEvent(res, 'connected', { message: 'Connected to agent stream' });

    const heartbeat = setInterval(() => {
      this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
    }, this.heartbeatInterval);

    req.on('close', () => {
      clearInterval(heartbeat);
      console.log('SSE client disconnected');
    });

    try {
      const { sessionId, answer } = req.body;

      if (!sessionId || !answer) {
        this.sendEvent(res, 'error', { message: 'Missing sessionId or answer parameter' });
        res.end();
        return;
      }

      const request: SessionMessageRequest = { sessionId, answer };

      const result = await this.agent.continueSession(
        request,
        (event: AgentEvent) => {
          this.sendEvent(res, event.type, event.data);
        }
      );

      this.sendEvent(res, 'result', result);
      
      clearInterval(heartbeat);
      res.end();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Session continue error:', error);
      this.sendEvent(res, 'error', { message: errorMessage });
      clearInterval(heartbeat);
      res.end();
    }
  }

  async streamAgentResponse(req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    this.sendEvent(res, 'connected', { message: 'Connected to agent stream' });

    const heartbeat = setInterval(() => {
      this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
    }, this.heartbeatInterval);

    req.on('close', () => {
      clearInterval(heartbeat);
      console.log('SSE client disconnected');
    });

    try {
      const { userInput, sessionId, context } = req.body;

      if (!userInput) {
        this.sendEvent(res, 'error', { message: 'Missing userInput parameter' });
        res.end();
        return;
      }

      const result = await this.agent.processRequest(
        { userInput, sessionId, context },
        (event: AgentEvent) => {
          this.sendEvent(res, event.type, event.data);
        }
      );

      if ((result as any).mode === 'web_component' && (result as any).component) {
        const component = (result as any).component;
        if (component.hash && component.javascript) {
          componentController.storeComponent(component.hash, component.javascript);
          
          component.javascriptUrl = `/api/v1/components/${component.hash}.js`;
          delete component.javascript;
        }
      }

      this.sendEvent(res, 'result', result);
      
      clearInterval(heartbeat);
      res.end();
    } catch (error: any) {
      console.error('SSE stream error:', error);
      this.sendEvent(res, 'error', { message: error.message });
      clearInterval(heartbeat);
      res.end();
    }
  }

  private sendEvent(res: Response, event: string, data: any): void {
    const eventData = JSON.stringify(data);
    res.write(`event: ${event}\n`);
    res.write(`data: ${eventData}\n\n`);
  }
}
