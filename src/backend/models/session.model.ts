import { IntentType, ComplexityLevel } from './agent.model';

export interface AgentSession {
  id: string;
  mode: 'chat' | 'wizard';
  intent: IntentType;
  mcpServerId: string | null;
  requiredFields: string[];
  answers: Record<string, string>;
  gaps: string[];
  questionNumber: number;
  maxQuestions: number;
  messages: ConversationMessage[];
  extractedData: Record<string, unknown>;
  complexity: ComplexityLevel;
  createdAt: string;
  expiresAt: string;
}

export interface ConversationMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    questionField?: string;
    isConfirmation?: boolean;
  };
}

export interface SessionStartRequest {
  userInput: string;
  mode?: 'chat' | 'wizard';
  scenario?: 'invoice' | 'travel' | 'auto';
}

export interface SessionMessageRequest {
  sessionId: string;
  answer: string;
}

export interface SessionResponse {
  sessionId: string;
  action: 'clarify' | 'generate';
  question?: string;
  questionNumber?: number;
  maxQuestions: number;
  intent?: IntentType;
  complexity?: ComplexityLevel;
  extractedData?: Record<string, unknown>;
  form?: unknown;
  component?: unknown;
  reasoning?: string;
}

export interface QuestionResult {
  question: string | null;
  field: string | null;
  remainingGaps: string[];
  isComplete: boolean;
}
