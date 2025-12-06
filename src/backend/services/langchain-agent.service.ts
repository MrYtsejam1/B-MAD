import { HfInference } from '@huggingface/inference';
import { AgentRequest, AgentResponse, IntentType, ComplexityLevel, AgentEvent } from '../models/agent.model';
import { AgentToolsService } from './agent-tools.service';
import { OutputModeService } from './output-mode.service';
import { SessionService } from './session.service';
import { 
  AgentSession, 
  SessionStartRequest, 
  SessionMessageRequest, 
  SessionResponse
} from '../models/session.model';

export class LangChainAgentService {
  private hf: HfInference;
  private tools: AgentToolsService;
  private outputMode: OutputModeService;
  private sessionService: SessionService;
  private readonly models = {
    intent: 'agentica-org/DeepCoder-14B-Preview:featherless-ai',
    generation: 'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai',
    fallback: 'ZHUI/GLM-4-32B-0414:featherless-ai',
  };

  private initialized: boolean = false;

  private readonly fieldQuestions: Record<string, string> = {
    date: 'What date was this expense?',
    amount: 'What was the total amount?',
    currency: 'What currency was used?',
    purpose: 'What was the purpose of this expense?',
    category: 'What category does this fall under (meals, travel, supplies, software, other)?',
    destination: 'Where are you traveling to?',
    origin: 'Where are you traveling from?',
    startDate: 'When does your trip start?',
    endDate: 'When does your trip end?',
    travelers: 'How many travelers will there be?',
    vendor: 'Who was the vendor or merchant?',
    flightDate: 'What is the date of your flight?',
    departureCity: 'What city are you departing from?',
    arrivalCity: 'What city are you arriving at?',
  };

  constructor() {
    const hfToken = process.env.HF_TOKEN || 'demo_key_not_configured';
    this.hf = new HfInference(hfToken);
    this.tools = new AgentToolsService();
    this.outputMode = new OutputModeService();
    this.sessionService = new SessionService();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.tools.initialize();
      this.initialized = true;
    }
  }

  async processRequest(request: AgentRequest, eventCallback?: (event: AgentEvent) => void): Promise<AgentResponse> {
    try {
      await this.ensureInitialized();
      
      this.emitEvent(eventCallback, 'analyzing', { message: 'Analyzing your request...' });

      const intent = await this.classifyIntent(request.userInput);
      console.log('[LangChainAgent] Detected intent:', intent);
      
      const complexity = this.detectComplexity(request.userInput, intent);
      console.log('[LangChainAgent] Detected complexity:', complexity);

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
      
      const model = request.context?.model;
      const result = await this.generateOutput(request.userInput, intent, complexity, model);

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

    if (userInput.includes('חשבונית') || userInput.includes('הוצאה') || userInput.includes('קבלה') || userInput.includes('החזר')) {
      return IntentType.INVOICE_SUBMISSION;
    }

    if (lowerInput.includes('travel') || lowerInput.includes('flight') || lowerInput.includes('hotel') || lowerInput.includes('trip')) {
      return IntentType.TRAVEL_BOOKING;
    }

    const hebrewTravelPattern = /(טיס[התות]?)|(מלונ(?:ו|וֹ)?ת?)|(נסיע[הת]?)|(תיירות)/;
    if (hebrewTravelPattern.test(userInput)) {
      console.log('[LangChainAgent] Matched Hebrew travel keyword');
      return IntentType.TRAVEL_BOOKING;
    }

    try {
      const prompt = `Classify the following user request into one of these categories. The input can be in ANY language (English, Hebrew, Arabic, etc.):
- invoice_submission: User wants to submit an expense or invoice
- travel_booking: User wants to book travel (flights, hotels, etc.)
- general_form: User wants to create a general form
- clarification: User is asking a question or needs clarification
- unknown: Cannot determine intent

Examples:
"I need to submit an expense" → invoice_submission
"אני רוצה להגיש חשבונית" → invoice_submission
"Book a flight to Rome" → travel_booking
"יש לי טיסת עבודה" → travel_booking

User request: "${userInput}"

Respond with ONLY one of: invoice_submission, travel_booking, general_form, clarification, unknown`;

      const response = await this.hf.chatCompletion({
        model: this.models.intent,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
        temperature: 0,
      });

      const classification = response.choices[0]?.message?.content?.trim().toLowerCase() || 'unknown';
      console.log('[LangChainAgent] LLM classification result:', classification);

      const match = classification.match(/\b(invoice_submission|travel_booking|general_form|clarification|unknown)\b/);
      if (match) {
        const category = match[1];
        if (category === 'invoice_submission') return IntentType.INVOICE_SUBMISSION;
        if (category === 'travel_booking') return IntentType.TRAVEL_BOOKING;
        if (category === 'general_form') return IntentType.GENERAL_FORM;
        if (category === 'clarification') return IntentType.CLARIFICATION;
      }

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

    if (intent === IntentType.INVOICE_SUBMISSION || intent === IntentType.TRAVEL_BOOKING) {
      if (hasDateRange || hasMultipleSteps || hasMultipleEntities) {
        return ComplexityLevel.COMPLEX;
      }
      return ComplexityLevel.MODERATE;
    }

    if (wordCount < 10 && !hasMultipleEntities) {
      return ComplexityLevel.SIMPLE;
    }

    return ComplexityLevel.MODERATE;
  }

  private async generateQuestions(userInput: string, intent: IntentType, _complexity: ComplexityLevel): Promise<string[] | undefined> {
    const mcpServerId = intent === IntentType.INVOICE_SUBMISSION ? 'invoice' : 
                        intent === IntentType.TRAVEL_BOOKING ? 'travel' : null;

    // Handle UNKNOWN or CLARIFICATION intents - ask clarifying questions
    if (intent === IntentType.UNKNOWN || intent === IntentType.CLARIFICATION) {
      const questions: string[] = [];
      questions.push('I\'m not sure I fully understand your request. Could you help me clarify?');
      questions.push('What would you like to do? For example:');
      questions.push('- Submit an expense or invoice');
      questions.push('- Book travel (flights, hotels, etc.)');
      questions.push('- Create a custom form');
      return questions;
    }

    // For GENERAL_FORM intent without MCP server, we can proceed without questions
    if (!mcpServerId) {
      return undefined;
    }

    const capabilities = await this.tools.mcpDescribe(mcpServerId);
    const requiredFields = capabilities.requirements?.requiredFields || [];

    const mentionedFields = this.extractMentionedFields(userInput, requiredFields);
    const missingFields = requiredFields.filter((field: string) => !mentionedFields.includes(field));

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

    if (missingFields.length > 0) {
      for (const field of missingFields.slice(0, 3)) {
        const question = fieldQuestions[field] || `What is the ${field}?`;
        questions.push(question);
      }
    }

    if (intent === IntentType.TRAVEL_BOOKING) {
      const extractedInfo = await this.extractTravelDetails(userInput);
      
      if (extractedInfo) {
        questions.push(`I understand you're planning a trip. Let me confirm the details:`);
        questions.push(`📍 From: ${extractedInfo.origin || '?'} → To: ${extractedInfo.destination || '?'}`);
        questions.push(`📅 Dates: ${extractedInfo.startDate || '?'} to ${extractedInfo.endDate || '?'}`);
        questions.push(`✈️ Flights: ${extractedInfo.flights || 'Not specified'}`);
        questions.push(`🏨 Hotel: ${extractedInfo.hotel || 'Not specified'}`);
        questions.push(`👥 Travelers: ${extractedInfo.travelers || 'Not specified'}`);
        questions.push(`Is this information correct? Any changes or additional preferences (cabin class, baggage, special requests)?`);
      } else {
        questions.push('I see you want to book travel. Could you confirm the key details?');
        questions.push('Any preferences for cabin class, baggage, or special requests?');
      }
      
      return questions;
    }

    if (intent === IntentType.INVOICE_SUBMISSION) {
      const extractedInfo = await this.extractInvoiceDetails(userInput);
      
      if (extractedInfo && (extractedInfo.date || extractedInfo.amount || extractedInfo.vendor)) {
        questions.push(`I understand you want to submit an expense. Let me confirm the details:`);
        questions.push(`📅 Date: ${extractedInfo.date || 'Not specified'}`);
        questions.push(`💰 Amount: ${extractedInfo.amount || 'Not specified'} ${extractedInfo.currency || ''}`);
        questions.push(`🏢 Vendor: ${extractedInfo.vendor || 'Not specified'}`);
        questions.push(`📂 Category: ${extractedInfo.category || 'Not specified'}`);
        questions.push(`📝 Purpose: ${extractedInfo.purpose || 'Not specified'}`);
        questions.push(`Is this information correct? Any additional details or attachments?`);
      } else {
        questions.push('I see you want to submit an expense. Could you provide the key details?');
        questions.push('What are the date, amount, vendor, and purpose of this expense?');
      }
      
      return questions;
    }

    return questions.length > 0 ? questions : undefined;
  }

  private async extractTravelDetails(userInput: string): Promise<any> {
    try {
      const prompt = `Extract travel booking details from the following text. Return ONLY a JSON object:
{
  "origin": "departure city",
  "destination": "arrival city",
  "startDate": "departure date",
  "endDate": "return date",
  "flights": "flight numbers if mentioned",
  "hotel": "hotel name if mentioned",
  "travelers": "traveler names or count"
}

Text: "${userInput}"

Return ONLY the JSON object:`;

      const response = await this.hf.chatCompletion({
        model: this.models.generation,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('[LangChainAgent] Failed to extract travel details:', error);
      return null;
    }
  }

  private async extractInvoiceDetails(userInput: string): Promise<any> {
    try {
      const prompt = `Extract expense/invoice details from the following text. Return ONLY a JSON object:
{
  "date": "expense date",
  "amount": "amount value",
  "currency": "currency code or symbol",
  "vendor": "vendor/merchant name",
  "category": "expense category (meals, travel, supplies, software, other)",
  "purpose": "purpose or description"
}

Text: "${userInput}"

Return ONLY the JSON object:`;

      const response = await this.hf.chatCompletion({
        model: this.models.generation,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('[LangChainAgent] Failed to extract invoice details:', error);
      return null;
    }
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

  private async generateOutput(userInput: string, intent: IntentType, _complexity: ComplexityLevel, model?: string): Promise<any> {
    
    const mcpServerId = intent === IntentType.INVOICE_SUBMISSION ? 'invoice' : 
                        intent === IntentType.TRAVEL_BOOKING ? 'travel' : null;

    let formData: any;

    if (mcpServerId) {
      const capabilities = await this.tools.mcpDescribe(mcpServerId);
      const requiredFields = capabilities.requirements?.requiredFields || [];
      
      console.log('[LangChainAgent] MCP capabilities:', {
        name: capabilities.name,
        requiredFields,
        requirementsExists: !!capabilities.requirements
      });
      
      formData = {
        title: capabilities.name,
        description: capabilities.description,
        fields: Array.isArray(requiredFields) ? requiredFields : [],
      };
    } else {
      formData = await this.extractFormFromPrompt(userInput);
    }

    const selectedModel = model || this.models.fallback;
    const mode = this.outputMode.getOutputMode(selectedModel);

    const output = await this.outputMode.generateOutput({ mode, model: selectedModel }, formData);

    return {
      ...output,
      reasoning: mcpServerId 
        ? `Generated form for ${intent} based on MCP server configuration`
        : `Generated form from user prompt: "${userInput.substring(0, 50)}..."`,
    };
  }

  private async extractFormFromPrompt(userInput: string): Promise<any> {
    try {
      const prompt = `Extract form fields from the following user request. Return ONLY a JSON object with this exact structure:
{
  "title": "Form Title",
  "description": "Brief description",
  "fields": [
    {"name": "fieldName", "label": "Field Label", "type": "text", "required": true, "placeholder": "Enter..."}
  ]
}

Supported types: text, email, number, date, tel, url, textarea
Extract meaningful field names from the user's request. If the user mentions specific fields, use those. Otherwise, infer appropriate fields.

User request: "${userInput}"

Return ONLY the JSON object, no other text:`;

      const response = await this.hf.chatCompletion({
        model: this.models.generation,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.fields && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
          console.log('[LangChainAgent] Extracted form fields:', parsed.fields.map((f: any) => f.name).join(', '));
          return parsed;
        }
      }
      
      throw new Error('Failed to parse LLM response');
    } catch (error) {
      console.error('[LangChainAgent] LLM extraction failed, using heuristic fallback:', error);
      return this.extractFormHeuristic(userInput);
    }
  }

  private extractFormHeuristic(userInput: string): any {
    const lowerInput = userInput.toLowerCase();
    const fields: any[] = [];
    
    const commonFields: Record<string, any> = {
      name: { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter your name' },
      email: { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
      phone: { name: 'phone', label: 'Phone', type: 'tel', required: false, placeholder: '+1 (555) 000-0000' },
      address: { name: 'address', label: 'Address', type: 'text', required: false, placeholder: 'Enter address' },
      message: { name: 'message', label: 'Message', type: 'textarea', required: false, placeholder: 'Enter your message' },
      date: { name: 'date', label: 'Date', type: 'date', required: false, placeholder: '' },
      amount: { name: 'amount', label: 'Amount', type: 'number', required: false, placeholder: '0.00' },
      description: { name: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Enter description' },
    };

    for (const [key, field] of Object.entries(commonFields)) {
      if (lowerInput.includes(key)) {
        fields.push(field);
      }
    }

    if (fields.length === 0) {
      fields.push(
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter your name' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
        { name: 'message', label: 'Message', type: 'textarea', required: false, placeholder: 'Enter your message' }
      );
    }

    return {
      title: 'Contact Form',
      description: 'Generated from your request',
      fields,
    };
  }

  async startSession(
    request: SessionStartRequest, 
    eventCallback?: (event: AgentEvent) => void
  ): Promise<SessionResponse> {
    await this.ensureInitialized();
    
    this.emitEvent(eventCallback, 'analyzing', { message: 'Analyzing your request...' });

    const intent = await this.classifyIntent(request.userInput);
    console.log('[LangChainAgent] Session start - Detected intent:', intent);
    
    const complexity = this.detectComplexity(request.userInput, intent);
    console.log('[LangChainAgent] Session start - Detected complexity:', complexity);

    const session = await this.sessionService.createSession(request, intent, complexity);

    this.emitEvent(eventCallback, 'session_started', { 
      sessionId: session.id,
      intent,
      complexity 
    });

    if (session.mcpServerId) {
      const capabilities = await this.tools.mcpDescribe(session.mcpServerId);
      const requiredFields = capabilities.requirements?.requiredFields || [];
      await this.sessionService.setRequiredFields(session, requiredFields);
    }

    const extractedData = await this.extractDataFromInput(request.userInput, intent);
    if (extractedData) {
      await this.sessionService.setExtractedData(session, extractedData);
    }

    const updatedSession = await this.sessionService.getSession(session.id);
    if (!updatedSession) {
      throw new Error('Session not found after creation');
    }

    if (complexity === ComplexityLevel.SIMPLE && this.sessionService.isSessionComplete(updatedSession)) {
      this.emitEvent(eventCallback, 'generating', { message: 'Generating form...' });
      const rawFormOutput = await this.generateOutput(request.userInput, intent, complexity);
      const combinedData = this.sessionService.getCombinedData(updatedSession);
      const formOutput = this.applyDefaultsToFormOutput(rawFormOutput, combinedData);
      this.emitEvent(eventCallback, 'complete', formOutput);
      
      return this.sessionService.buildSessionResponse(updatedSession, 'generate', undefined, formOutput);
    }

    const questionResult = this.sessionService.getNextQuestion(updatedSession, this.fieldQuestions);
    
    if (questionResult.question) {
      await this.sessionService.incrementQuestionNumber(updatedSession);
      await this.sessionService.addAgentMessage(updatedSession, questionResult.question, { 
        questionField: questionResult.field || undefined 
      });
      
      this.emitEvent(eventCallback, 'question', { 
        question: questionResult.question,
        questionNumber: updatedSession.questionNumber,
        maxQuestions: updatedSession.maxQuestions,
        sessionId: updatedSession.id,
      });
      
      return this.sessionService.buildSessionResponse(updatedSession, 'clarify', questionResult);
    }

    this.emitEvent(eventCallback, 'generating', { message: 'Generating form...' });
    const rawFormOutput = await this.generateOutput(request.userInput, intent, complexity);
    const combinedData = this.sessionService.getCombinedData(updatedSession);
    const formOutput = this.applyDefaultsToFormOutput(rawFormOutput, combinedData);
    this.emitEvent(eventCallback, 'complete', formOutput);
    
    return this.sessionService.buildSessionResponse(updatedSession, 'generate', undefined, formOutput);
  }

  async continueSession(
    request: SessionMessageRequest,
    eventCallback?: (event: AgentEvent) => void
  ): Promise<SessionResponse> {
    await this.ensureInitialized();

    const session = await this.sessionService.getSession(request.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${request.sessionId}`);
    }

    const lastAgentMessage = [...session.messages].reverse().find(m => m.role === 'agent');
    const lastQuestionField = lastAgentMessage?.metadata?.questionField || null;

    if (session.intent === IntentType.UNKNOWN || session.intent === IntentType.CLARIFICATION) {
      const inferredIntent = await this.inferIntentFromAnswer(request.answer);
      console.log('[LangChainAgent] Inferred intent from answer:', inferredIntent);
      
      if (inferredIntent !== IntentType.UNKNOWN) {
        await this.sessionService.updateSessionIntent(session, inferredIntent);
        
        if (session.mcpServerId) {
          const capabilities = await this.tools.mcpDescribe(session.mcpServerId);
          const requiredFields = capabilities.requirements?.requiredFields || [];
          await this.sessionService.setRequiredFields(session, requiredFields);
        }
      }
    }

    await this.sessionService.updateSessionWithAnswer(session, request.answer, lastQuestionField);

    const updatedSession = await this.sessionService.getSession(session.id);
    if (!updatedSession) {
      throw new Error('Session not found after update');
    }

    if (this.sessionService.isSessionComplete(updatedSession)) {
      this.emitEvent(eventCallback, 'generating', { message: 'Generating form...' });
      
      const userInput = this.buildUserInputFromSession(updatedSession);
      const rawFormOutput = await this.generateOutput(userInput, updatedSession.intent, updatedSession.complexity);
      const combinedData = this.sessionService.getCombinedData(updatedSession);
      const formOutput = this.applyDefaultsToFormOutput(rawFormOutput, combinedData);
      
      this.emitEvent(eventCallback, 'complete', formOutput);
      
      return this.sessionService.buildSessionResponse(updatedSession, 'generate', undefined, formOutput);
    }

    const questionResult = this.sessionService.getNextQuestion(updatedSession, this.fieldQuestions);
    
    if (questionResult.question) {
      await this.sessionService.incrementQuestionNumber(updatedSession);
      await this.sessionService.addAgentMessage(updatedSession, questionResult.question, {
        questionField: questionResult.field || undefined
      });
      
      this.emitEvent(eventCallback, 'question', {
        question: questionResult.question,
        questionNumber: updatedSession.questionNumber,
        maxQuestions: updatedSession.maxQuestions,
        sessionId: updatedSession.id,
      });
      
      return this.sessionService.buildSessionResponse(updatedSession, 'clarify', questionResult);
    }

    this.emitEvent(eventCallback, 'generating', { message: 'Generating form...' });
    const userInput = this.buildUserInputFromSession(updatedSession);
    const rawFormOutput = await this.generateOutput(userInput, updatedSession.intent, updatedSession.complexity);
    const combinedData = this.sessionService.getCombinedData(updatedSession);
    const formOutput = this.applyDefaultsToFormOutput(rawFormOutput, combinedData);
    this.emitEvent(eventCallback, 'complete', formOutput);
    
    return this.sessionService.buildSessionResponse(updatedSession, 'generate', undefined, formOutput);
  }

  private async extractDataFromInput(userInput: string, intent: IntentType): Promise<Record<string, unknown> | null> {
    if (intent === IntentType.TRAVEL_BOOKING) {
      return await this.extractTravelDetails(userInput);
    }
    if (intent === IntentType.INVOICE_SUBMISSION) {
      return await this.extractInvoiceDetails(userInput);
    }
    return null;
  }

  private async inferIntentFromAnswer(answer: string): Promise<IntentType> {
    const lowerAnswer = answer.toLowerCase();
    
    if (lowerAnswer.includes('expense') || lowerAnswer.includes('invoice') || lowerAnswer.includes('receipt') || lowerAnswer.includes('submit')) {
      return IntentType.INVOICE_SUBMISSION;
    }
    if (lowerAnswer.includes('travel') || lowerAnswer.includes('trip') || lowerAnswer.includes('flight') || lowerAnswer.includes('hotel')) {
      return IntentType.TRAVEL_BOOKING;
    }
    if (lowerAnswer.includes('form') || lowerAnswer.includes('create') || lowerAnswer.includes('custom')) {
      return IntentType.GENERAL_FORM;
    }
    
    return IntentType.UNKNOWN;
  }

  private buildUserInputFromSession(session: AgentSession): string {
    const parts: string[] = [];
    
    const firstUserMessage = session.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      parts.push(firstUserMessage.content);
    }
    
    for (const [field, value] of Object.entries(session.answers)) {
      if (value && typeof value === 'string') {
        parts.push(`${field}: ${value}`);
      }
    }
    
    return parts.join('. ');
  }

  private emitEvent(callback: ((event: AgentEvent) => void) | undefined, type: AgentEvent['type'], data?: unknown): void {
    if (callback) {
      callback({
        type,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Apply default values to form output from collected session data
   * This pre-fills form fields with the data collected during conversation
   */
  private applyDefaultsToFormOutput(formOutput: unknown, data: Record<string, unknown>): unknown {
    if (!formOutput || !data || typeof formOutput !== 'object') {
      return formOutput;
    }

    const output = formOutput as Record<string, unknown>;
    
    // Handle JSON schema mode
    const schema = (output.schema || output.formSchema) as Record<string, unknown> | undefined;
    if (schema && Array.isArray(schema.fields)) {
      for (const field of schema.fields as Array<Record<string, unknown>>) {
        const key = field.name as string;
        if (key && data[key] != null && data[key] !== '') {
          field.defaultValue = data[key];
        }
      }
    }

    // Handle web component mode - inject data into component metadata
    const component = output.component as Record<string, unknown> | undefined;
    if (component) {
      component.formData = data;
    }

    console.log('[LangChainAgent] Applied defaults to form output:', {
      fieldsWithDefaults: schema?.fields ? (schema.fields as Array<Record<string, unknown>>).filter(f => f.defaultValue).map(f => f.name) : [],
      dataKeys: Object.keys(data).filter(k => data[k])
    });

    return output;
  }
}
