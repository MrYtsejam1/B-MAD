import { HfInference } from '@huggingface/inference';
import { AgentRequest, AgentResponse, IntentType, ComplexityLevel, AgentEvent } from '../models/agent.model';
import { AgentToolsService } from './agent-tools.service';

export class LangChainAgentService {
  private hf: HfInference;
  private tools: AgentToolsService;
  private readonly models = {
    intent: 'agentica-org/DeepCoder-14B-Preview:featherless-ai',
    generation: 'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai',
    fallback: 'ZHUI/GLM-4-32B-0414:featherless-ai',
  };

  constructor() {
    const hfToken = process.env.HF_TOKEN || 'demo_key_not_configured';
    this.hf = new HfInference(hfToken);
    this.tools = new AgentToolsService();
  }

  async processRequest(request: AgentRequest, eventCallback?: (event: AgentEvent) => void): Promise<AgentResponse> {
    try {
      this.emitEvent(eventCallback, 'analyzing', { message: 'Analyzing your request...' });

      const intent = await this.classifyIntent(request.userInput);
      
      const complexity = this.detectComplexity(request.userInput, intent);

      const questions = complexity !== ComplexityLevel.SIMPLE 
        ? await this.generateQuestions(request.userInput, intent, complexity)
        : undefined;

      if (questions && questions.length > 0) {
        this.emitEvent(eventCallback, 'question', { questions });
        return {
          intent,
          complexity,
          questions,
          confidence: 0.85,
          reasoning: 'Need more information to proceed',
        };
      }

      this.emitEvent(eventCallback, 'generating', { message: 'Generating form...' });
      
      const result = await this.generateOutput(request.userInput, intent, complexity);

      this.emitEvent(eventCallback, 'complete', result);

      return {
        intent,
        complexity,
        ...result,
        confidence: 0.9,
      };
    } catch (error: any) {
      console.error('Agent processing failed:', error);
      this.emitEvent(eventCallback, 'error', { message: error.message });
      
      throw error;
    }
  }

  private async classifyIntent(userInput: string): Promise<IntentType> {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('invoice') || lowerInput.includes('expense') || lowerInput.includes('receipt')) {
      return IntentType.INVOICE_SUBMISSION;
    }

    if (lowerInput.includes('travel') || lowerInput.includes('flight') || lowerInput.includes('hotel') || lowerInput.includes('trip')) {
      return IntentType.TRAVEL_BOOKING;
    }

    try {
      const prompt = `Classify the following user request into one of these categories:
- invoice_submission: User wants to submit an expense or invoice
- travel_booking: User wants to book travel (flights, hotels, etc.)
- general_form: User wants to create a general form
- clarification: User is asking a question or needs clarification
- unknown: Cannot determine intent

User request: "${userInput}"

Respond with only the category name, nothing else.`;

      const response = await this.hf.chatCompletion({
        model: this.models.intent,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.1,
      });

      const classification = response.choices[0]?.message?.content?.trim().toLowerCase() || 'unknown';

      if (classification.includes('invoice')) return IntentType.INVOICE_SUBMISSION;
      if (classification.includes('travel')) return IntentType.TRAVEL_BOOKING;
      if (classification.includes('general')) return IntentType.GENERAL_FORM;
      if (classification.includes('clarification')) return IntentType.CLARIFICATION;

      return IntentType.UNKNOWN;
    } catch (error) {
      console.error('Intent classification failed:', error);
      return IntentType.GENERAL_FORM;
    }
  }

  private detectComplexity(userInput: string, intent: IntentType): ComplexityLevel {
    const wordCount = userInput.split(/\s+/).length;
    const hasMultipleEntities = (userInput.match(/,|and|also|plus/gi) || []).length > 2;
    const hasDateRange = /from .* to|between .* and/i.test(userInput);
    const hasMultipleSteps = /first|then|after|next/i.test(userInput);

    if (wordCount < 10 && !hasMultipleEntities && intent !== IntentType.TRAVEL_BOOKING) {
      return ComplexityLevel.SIMPLE;
    }

    if (intent === IntentType.TRAVEL_BOOKING || hasDateRange || hasMultipleSteps) {
      return ComplexityLevel.COMPLEX;
    }

    return ComplexityLevel.MODERATE;
  }

  private async generateQuestions(userInput: string, intent: IntentType, _complexity: ComplexityLevel): Promise<string[] | undefined> {
    const mcpServerId = intent === IntentType.INVOICE_SUBMISSION ? 'invoice' : 
                        intent === IntentType.TRAVEL_BOOKING ? 'travel' : null;

    if (!mcpServerId) {
      return undefined;
    }

    const capabilities = await this.tools.mcpDescribe(mcpServerId);
    const requiredFields = capabilities.requirements?.requiredFields || [];

    const mentionedFields = this.extractMentionedFields(userInput, requiredFields);
    const missingFields = requiredFields.filter((field: string) => !mentionedFields.includes(field));

    if (missingFields.length === 0) {
      return undefined;
    }

    const questions: string[] = [];
    const fieldQuestions: Record<string, string> = {
      date: 'What date was this expense?',
      amount: 'What was the amount?',
      currency: 'What currency?',
      purpose: 'What was the purpose of this expense?',
      category: 'What category does this fall under (meals, travel, supplies, software, other)?',
      destination: 'Where are you traveling to?',
      startDate: 'When does your trip start?',
      endDate: 'When does your trip end?',
      travelers: 'How many travelers?',
    };

    for (const field of missingFields.slice(0, 3)) {
      const question = fieldQuestions[field] || `What is the ${field}?`;
      questions.push(question);
    }

    return questions.length > 0 ? questions : undefined;
  }

  private extractMentionedFields(userInput: string, requiredFields: string[]): string[] {
    const mentioned: string[] = [];
    const lowerInput = userInput.toLowerCase();

    for (const field of requiredFields) {
      switch (field) {
        case 'date':
          if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|yesterday|today|last week/i.test(userInput)) {
            mentioned.push('date');
          }
          break;
        case 'amount':
          if (/\$\d+|\d+\s*dollars?/i.test(userInput)) {
            mentioned.push('amount');
          }
          break;
        case 'currency':
          if (/USD|EUR|GBP|CAD|\$/i.test(userInput)) {
            mentioned.push('currency');
          }
          break;
        case 'purpose':
          if (lowerInput.length > 20) {
            mentioned.push('purpose');
          }
          break;
        case 'category':
          if (/meals?|travel|supplies|software|lunch|dinner|flight|hotel/i.test(userInput)) {
            mentioned.push('category');
          }
          break;
      }
    }

    return mentioned;
  }

  private async generateOutput(_userInput: string, intent: IntentType, _complexity: ComplexityLevel): Promise<any> {
    
    const mcpServerId = intent === IntentType.INVOICE_SUBMISSION ? 'invoice' : 
                        intent === IntentType.TRAVEL_BOOKING ? 'travel' : null;

    if (mcpServerId) {
      const capabilities = await this.tools.mcpDescribe(mcpServerId);
      
      return {
        formSchema: {
          title: capabilities.name,
          description: capabilities.description,
          fields: capabilities.requirements?.requiredFields || [],
        },
        reasoning: `Generated form for ${intent} based on MCP server configuration`,
      };
    }

    return {
      formSchema: {
        title: 'General Form',
        description: 'Generated from user input',
        fields: ['field1', 'field2'],
      },
      reasoning: 'Generated general form',
    };
  }

  private emitEvent(callback: ((event: AgentEvent) => void) | undefined, type: AgentEvent['type'], data?: any): void {
    if (callback) {
      callback({
        type,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
