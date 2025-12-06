import { HfInference } from '@huggingface/inference';
import { AgentRequest, AgentResponse, IntentType, ComplexityLevel, AgentEvent } from '../models/agent.model';
import { AgentToolsService } from './agent-tools.service';
import { OutputModeService } from './output-mode.service';

export class LangChainAgentService {
  private hf: HfInference;
  private tools: AgentToolsService;
  private outputMode: OutputModeService;
  private readonly models = {
    intent: 'agentica-org/DeepCoder-14B-Preview:featherless-ai',
    generation: 'Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai',
    fallback: 'ZHUI/GLM-4-32B-0414:featherless-ai',
  };

  private initialized: boolean = false;

  constructor() {
    const hfToken = process.env.HF_TOKEN || 'demo_key_not_configured';
    this.hf = new HfInference(hfToken);
    this.tools = new AgentToolsService();
    this.outputMode = new OutputModeService();
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

    if (userInput.includes('טיסה') || userInput.includes('מלון') || userInput.includes('נסיעה') || userInput.includes('תיירות')) {
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
        max_tokens: 50,
        temperature: 0.1,
      });

      const classification = response.choices[0]?.message?.content?.trim().toLowerCase() || 'unknown';
      console.log('[LangChainAgent] LLM classification result:', classification);

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
      
      formData = {
        title: capabilities.name,
        description: capabilities.description,
        fields: capabilities.requirements?.requiredFields || [],
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
