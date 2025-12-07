export interface AgentRequest {
  userInput: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface AgentResponse {
  intent: IntentType;
  complexity: ComplexityLevel;
  questions?: string[];
  formSchema?: any;
  component?: string;
  reasoning?: string;
  confidence: number;
}

export enum IntentType {
  INVOICE_SUBMISSION = 'invoice_submission',
  TRAVEL_BOOKING = 'travel_booking',
  GENERAL_FORM = 'general_form',
  CLARIFICATION = 'clarification',
  UNKNOWN = 'unknown',
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface AgentEvent {
  type: 'analyzing' | 'question' | 'generating' | 'complete' | 'error' | 'session_started' | 'file_upload_request';
  data?: any;
  timestamp: string;
}
