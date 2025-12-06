import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';
import { IntentType, ComplexityLevel } from '../models/agent.model';
import { 
  AgentSession, 
  ConversationMessage, 
  QuestionResult,
  SessionStartRequest,
  SessionResponse 
} from '../models/session.model';
import Redis from 'ioredis';

export class SessionService {
  private redis: Redis;
  private sessionTTL: number;
  private maxQuestions: number;

  constructor() {
    this.redis = getRedisClient();
    this.sessionTTL = parseInt(process.env.SESSION_TTL_SECONDS || '7200');
    this.maxQuestions = parseInt(process.env.AI_MAX_QUESTIONS || '3');
  }

  private getSessionKey(sessionId: string): string {
    return `agent:session:${sessionId}`;
  }

  async createSession(request: SessionStartRequest, intent: IntentType, complexity: ComplexityLevel): Promise<AgentSession> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);

    const session: AgentSession = {
      id: sessionId,
      mode: request.mode || 'chat',
      intent,
      mcpServerId: this.getMcpServerId(intent),
      requiredFields: [],
      answers: {},
      gaps: [],
      questionNumber: 0,
      maxQuestions: this.maxQuestions,
      messages: [{
        role: 'user',
        content: request.userInput,
        timestamp: now.toISOString(),
      }],
      extractedData: {},
      complexity,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.saveSession(session);
    logger.info('Session created', { sessionId, intent, complexity });
    
    return session;
  }

  async getSession(sessionId: string): Promise<AgentSession | null> {
    try {
      const key = this.getSessionKey(sessionId);
      const data = await this.redis.get(key);
      
      if (!data) {
        logger.debug('Session not found', { sessionId });
        return null;
      }

      return JSON.parse(data) as AgentSession;
    } catch (error) {
      logger.error('Failed to get session', { sessionId, error });
      return null;
    }
  }

  async saveSession(session: AgentSession): Promise<void> {
    try {
      const key = this.getSessionKey(session.id);
      const ttl = Math.max(1, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      
      await this.redis.setex(key, ttl, JSON.stringify(session));
      logger.debug('Session saved', { sessionId: session.id });
    } catch (error) {
      logger.error('Failed to save session', { sessionId: session.id, error });
      throw error;
    }
  }

  async updateSessionWithAnswer(session: AgentSession, answer: string, field: string | null): Promise<AgentSession> {
    const now = new Date().toISOString();
    
    session.messages.push({
      role: 'user',
      content: answer,
      timestamp: now,
      metadata: field ? { questionField: field } : undefined,
    });

    if (field) {
      session.answers[field] = answer;
      session.gaps = session.gaps.filter(g => g !== field);
    }

    await this.saveSession(session);
    return session;
  }

  async addAgentMessage(session: AgentSession, content: string, metadata?: ConversationMessage['metadata']): Promise<AgentSession> {
    session.messages.push({
      role: 'agent',
      content,
      timestamp: new Date().toISOString(),
      metadata,
    });

    await this.saveSession(session);
    return session;
  }

  async updateSessionIntent(session: AgentSession, intent: IntentType): Promise<AgentSession> {
    session.intent = intent;
    session.mcpServerId = this.getMcpServerId(intent);
    await this.saveSession(session);
    return session;
  }

  async setRequiredFields(session: AgentSession, fields: string[]): Promise<AgentSession> {
    session.requiredFields = fields;
    session.gaps = fields.filter(f => !session.answers[f]);
    
    // Dynamically set maxQuestions based on gaps
    // If there are many missing fields, allow more questions to collect all required data
    // Only limit to 3 if most data is already provided
    const gapsCount = session.gaps.length;
    if (gapsCount > this.maxQuestions) {
      // Allow asking for all missing required fields
      session.maxQuestions = gapsCount;
      logger.info('Increased maxQuestions to collect all required fields', { 
        sessionId: session.id, 
        gapsCount, 
        maxQuestions: session.maxQuestions 
      });
    }
    
    await this.saveSession(session);
    return session;
  }

  async setExtractedData(session: AgentSession, data: Record<string, unknown>): Promise<AgentSession> {
    session.extractedData = { ...session.extractedData, ...data };
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'string' && value.trim()) {
        session.answers[key] = value;
        session.gaps = session.gaps.filter(g => g !== key);
      }
    }
    
    await this.saveSession(session);
    return session;
  }

  async incrementQuestionNumber(session: AgentSession): Promise<AgentSession> {
    session.questionNumber++;
    await this.saveSession(session);
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = this.getSessionKey(sessionId);
      await this.redis.del(key);
      logger.info('Session deleted', { sessionId });
    } catch (error) {
      logger.error('Failed to delete session', { sessionId, error });
    }
  }

  private getMcpServerId(intent: IntentType): string | null {
    switch (intent) {
      case IntentType.INVOICE_SUBMISSION:
        return 'invoice';
      case IntentType.TRAVEL_BOOKING:
        return 'travel';
      default:
        return null;
    }
  }

  getNextQuestion(session: AgentSession, fieldQuestions: Record<string, string>): QuestionResult {
    if (session.intent === IntentType.UNKNOWN || session.intent === IntentType.CLARIFICATION) {
      return {
        question: 'I\'d like to help you. Could you tell me what you\'re trying to do? For example, are you submitting an expense, planning a business trip, or creating a different type of form?',
        field: 'intent',
        remainingGaps: ['intent'],
        isComplete: false,
      };
    }

    if (session.gaps.length === 0) {
      return {
        question: null,
        field: null,
        remainingGaps: [],
        isComplete: true,
      };
    }

    if (session.questionNumber >= session.maxQuestions) {
      return {
        question: null,
        field: null,
        remainingGaps: session.gaps,
        isComplete: true,
      };
    }

    const nextField = session.gaps[0];
    const question = fieldQuestions[nextField] || `What is the ${nextField}?`;

    return {
      question,
      field: nextField,
      remainingGaps: session.gaps.slice(1),
      isComplete: false,
    };
  }

  buildSessionResponse(
    session: AgentSession, 
    action: 'clarify' | 'generate' | 'file_upload',
    questionResult?: QuestionResult | { message: string; accept: string; endpoint: string },
    formOutput?: unknown
  ): SessionResponse {
    // Use combined data (extractedData + answers) so UI shows user's responses
    const combinedData = this.getCombinedData(session);
    
    const response: SessionResponse = {
      sessionId: session.id,
      action,
      maxQuestions: session.maxQuestions,
      intent: session.intent,
      complexity: session.complexity,
      extractedData: combinedData,
    };

    if (action === 'clarify' && questionResult && 'question' in questionResult && questionResult.question) {
      response.question = questionResult.question;
      response.questionNumber = session.questionNumber;
    }

    if (action === 'file_upload' && questionResult && 'message' in questionResult) {
      response.fileUpload = {
        message: questionResult.message,
        accept: questionResult.accept,
        endpoint: questionResult.endpoint,
      };
    }

    if (action === 'generate' && formOutput) {
      if (typeof formOutput === 'object' && formOutput !== null) {
        const output = formOutput as Record<string, unknown>;
        response.form = output.formSchema;
        response.component = output.component;
        response.reasoning = output.reasoning as string | undefined;
      }
    }

    return response;
  }

  isSessionComplete(session: AgentSession): boolean {
    if (session.intent === IntentType.UNKNOWN || session.intent === IntentType.CLARIFICATION) {
      return false;
    }

    return session.gaps.length === 0 || session.questionNumber >= session.maxQuestions;
  }

  /**
   * Get combined data from extractedData and answers
   * Answers take precedence over extractedData
   */
  getCombinedData(session: AgentSession): Record<string, unknown> {
    const combined: Record<string, unknown> = {};
    
    // Start with extractedData
    if (session.extractedData) {
      Object.assign(combined, session.extractedData);
    }
    
    // Override with answers (user's explicit responses)
    if (session.answers) {
      for (const [key, value] of Object.entries(session.answers)) {
        if (value && typeof value === 'string' && value.trim()) {
          combined[key] = value;
        }
      }
    }
    
    return combined;
  }
}
