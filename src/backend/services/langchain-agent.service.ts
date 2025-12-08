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
    // Share the HfInference instance with OutputModeService for coder model form design
    this.outputMode.setHfInference(this.hf);
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
    // First, try to detect MCP server from configured prompts (Hebrew and English keywords)
    const detectedServer = this.tools.detectMcpServerFromInput(userInput);
    if (detectedServer) {
      console.log(`[LangChainAgent] Auto-detected MCP server from prompts: ${detectedServer}`);
      if (detectedServer === 'invoice') {
        return IntentType.INVOICE_SUBMISSION;
      }
      if (detectedServer === 'travel') {
        return IntentType.TRAVEL_BOOKING;
      }
    }

    // Fallback to basic keyword matching if MCP prompts didn't match
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('invoice') || lowerInput.includes('expense') || lowerInput.includes('receipt')) {
      return IntentType.INVOICE_SUBMISSION;
    }

    if (lowerInput.includes('travel') || lowerInput.includes('flight') || lowerInput.includes('hotel') || lowerInput.includes('trip')) {
      return IntentType.TRAVEL_BOOKING;
    }

    // Fallback Hebrew patterns for edge cases not covered by MCP prompts
    const hebrewTravelPattern = /(טיס[התות]?)|(מלונ(?:ו|וֹ)?ת?)|(נסיע[הת]?)|(תיירות)/;
    if (hebrewTravelPattern.test(userInput)) {
      console.log('[LangChainAgent] Matched Hebrew travel keyword (fallback pattern)');
      return IntentType.TRAVEL_BOOKING;
    }

    const hebrewInvoicePattern = /(חשבונית)|(הוצאה)|(קבלה)|(החזר)/;
    if (hebrewInvoicePattern.test(userInput)) {
      console.log('[LangChainAgent] Matched Hebrew invoice keyword (fallback pattern)');
      return IntentType.INVOICE_SUBMISSION;
    }

    try {
      // Get MCP prompts for LLM context
      const mcpPrompts = this.tools.getMcpIntentPrompts();
      let promptExamples = '';
      for (const [serverId, prompts] of mcpPrompts) {
        const heExamples = prompts.he.slice(0, 2).join(', ');
        const enExamples = prompts.en.slice(0, 2).join(', ');
        promptExamples += `\n- ${serverId}: Hebrew keywords (${heExamples}), English keywords (${enExamples})`;
      }

      const prompt = `Classify the following user request into one of these categories. The input can be in ANY language (English, Hebrew, Arabic, etc.):
- invoice_submission: User wants to submit an expense, invoice, or bill refund
- travel_booking: User wants to book travel (flights, hotels, business trips, vacations)
- general_form: User wants to create a general form
- clarification: User is asking a question or needs clarification
- unknown: Cannot determine intent

Available MCP tools and their keywords:${promptExamples}

Examples:
"I need to submit an expense" → invoice_submission
"אני רוצה להגיש חשבונית" → invoice_submission
"Book a flight to Rome" → travel_booking
"יש לי טיסת עבודה" → travel_booking
"חופשה בפראג" → travel_booking
"החזר על קבלה" → invoice_submission

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
    const formSchema = capabilities.formSchema;

    const mentionedFields = this.extractMentionedFields(userInput, requiredFields);
    const missingFields = requiredFields.filter((field: string) => !mentionedFields.includes(field));

    const questions: string[] = [];
    
    // Build field questions dynamically from MCP formSchema
    const fieldQuestions: Record<string, string> = {};
    if (formSchema?.fields) {
      for (const field of formSchema.fields) {
        const fieldName = field.name;
        const label = field.label || fieldName;
        const labelHe = field.labelHe;
        // Generate question based on field type and label
        if (field.type === 'select' && field.options) {
          const optionLabels = field.options.map((opt: any) => opt.label).join(', ');
          fieldQuestions[fieldName] = `What is the ${label}? (Options: ${optionLabels})`;
        } else if (field.type === 'file') {
          fieldQuestions[fieldName] = `Would you like to upload a file for ${label}?`;
        } else if (field.type === 'textarea') {
          fieldQuestions[fieldName] = `Please provide the ${label}:`;
        } else {
          fieldQuestions[fieldName] = `What is the ${label}?`;
        }
        // Add Hebrew label hint if available
        if (labelHe) {
          fieldQuestions[fieldName] += ` (${labelHe})`;
        }
      }
    }
    
    // Fallback questions for common fields not in schema
    const fallbackQuestions: Record<string, string> = {
      date: 'What date was this expense?',
      amount: 'What was the amount?',
      currency: 'What currency?',
      purpose: 'What was the purpose of this expense?',
      category: 'What category does this fall under?',
      destination: 'Where are you traveling to?',
      startDate: 'When does your trip start?',
      endDate: 'When does your trip end?',
      travelers: 'How many travelers?',
      workerName: 'What is your name?',
      travelersNames: 'Who else is traveling with you? (co-workers)',
      departureCity: 'What city are you departing from?',
      destinationCity: 'What is your destination city?',
      passport: 'What is your passport number?',
      departureFlightNumber: 'What is your departure flight number?',
      returnFlightNumber: 'What is your return flight number?',
      hotelDetails: 'What hotel will you be staying at? (name and address)',
      invoiceUpload: 'Would you like to upload an invoice image?',
      invoiceDetails: 'Please provide the invoice details:',
      expenseType: 'What type of expense is this? (parking, food, hotel, flight, conference)',
    };

    if (missingFields.length > 0) {
      for (const field of missingFields.slice(0, 3)) {
        const question = fieldQuestions[field] || fallbackQuestions[field] || `What is the ${field}?`;
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
      // Get today's date in ISO format for the LLM to use as reference
      const todayIso = new Date().toISOString().slice(0, 10);
      
      const prompt = `You are a travel assistant that extracts and NORMALIZES travel details from user text.
The text may be in Hebrew or English.

Today's date is ${todayIso} (YYYY-MM-DD).

Extract the details and return ONLY a JSON object with this shape:
{
  "workerName": "name of the person making the request or null",
  "origin": "departure city or null",
  "destination": "arrival city or null",
  "startDate": "departure date in ISO 8601 format YYYY-MM-DD or null",
  "endDate": "return date in ISO 8601 format YYYY-MM-DD or null",
  "flights": "flight numbers as comma-separated string or null",
  "hotel": "hotel name if mentioned or null",
  "travelers": "comma-separated list of ALL traveler names or null"
}

VERY IMPORTANT NAME EXTRACTION RULES:
- Extract the worker's name from patterns like "אני [שם]" (I am [name]), "שמי [שם]" (my name is [name]), "I'm [name]", "I am [name]"
- Extract traveler names from patterns like "נוסע עם [שם]" (traveling with [name]), "עם [שם]" (with [name]), "traveling with [name]"
- If the user says "אני דוד גואטה" -> workerName is "דוד גואטה"
- If the user says "נוסע עם yosi yehuda" -> include "yosi yehuda" in travelers
- The travelers field should include ALL people traveling, including the worker if they are traveling
- Example: "אני דוד גואטה, נוסע עם yosi yehuda" -> workerName: "דוד גואטה", travelers: "דוד גואטה, yosi yehuda"

VERY IMPORTANT DATE RULES:
- You MUST convert ALL dates to absolute calendar dates in ISO 8601 format (YYYY-MM-DD).
- Do NOT return relative words like "מחר", "מחרתיים", "בעוד 5 ימים", "היום", "בחודש הבא" in the date fields.
- Use today's date (${todayIso}) as the reference point for relative expressions.
- If the user says "אני טס מחר" (I fly tomorrow), calculate tomorrow's actual date from ${todayIso}.
- If the user says "אני חוזר בעוד 5 ימים" (I return in 5 days), calculate 5 days AFTER the departure date (not from today).
- If the user says "ב10 לינואר" or "ב-10 לינואר", convert it to YYYY-01-10 for the next occurrence.
- If you cannot determine a date, use null for that field.

Examples (today is ${todayIso}):
1) "אני דוד גואטה, טס מחר עם yosi" -> workerName: "דוד גואטה", travelers: "דוד גואטה, yosi", startDate: tomorrow
2) "יש לי טיסה ב-10 לינואר" -> startDate is the next January 10th in YYYY-MM-DD format
3) "אני משה נוסע עם דני לרומא" -> workerName: "משה", travelers: "משה, דני", destination: "רומא"

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
      // Get today's date in ISO format for the LLM to use as reference
      const todayIso = new Date().toISOString().slice(0, 10);
      
      const prompt = `You are an expense assistant that extracts and NORMALIZES invoice/expense details from user text.
The text may be in Hebrew or English.

Today's date is ${todayIso} (YYYY-MM-DD).

Extract the details and return ONLY a JSON object with this shape:
{
  "workerName": "name of the person submitting or null",
  "date": "invoice/expense date in ISO 8601 format YYYY-MM-DD or null",
  "amount": "amount value or null",
  "currency": "currency code (ILS, USD, EUR) or symbol or null",
  "vendor": "vendor/merchant name or null",
  "category": "expense category (parking, food, hotel, flight, conference, other) or null",
  "purpose": "purpose or description of the expense or null"
}

VERY IMPORTANT NAME EXTRACTION RULES:
- Extract the worker's name from patterns like "אני [שם]" (I am [name]), "שמי [שם]" (my name is [name]), "I'm [name]", "I am [name]"
- If the user says "אני דוד גואטה" -> workerName is "דוד גואטה"
- If the user says "I'm John Smith" -> workerName is "John Smith"
- Look for name patterns at the beginning of the text or after phrases like "אני", "שמי", "I am", "I'm"

VERY IMPORTANT DATE RULES:
- You MUST convert ALL dates to absolute calendar dates in ISO 8601 format (YYYY-MM-DD).
- Do NOT return relative words like "אתמול", "היום", "בשבוע שעבר", "לפני יומיים" in the date field.
- Use today's date (${todayIso}) as the reference point for relative expressions.
- If the user says "אתמול" (yesterday), calculate yesterday's actual date from ${todayIso}.
- If the user says "לפני שבוע" (a week ago), calculate 7 days before ${todayIso}.
- If the user says "ב-5 לנובמבר", convert it to YYYY-11-05 for the most recent occurrence.
- If you cannot determine a date, use null for that field.

Examples (today is ${todayIso}):
1) "אני דוד, יש לי חשבונית מאתמול" -> workerName: "דוד", date: yesterday's date
2) "הוצאה מלפני שבוע" -> date is 7 days before today in YYYY-MM-DD format
3) "אני משה כהן, רוצה להגיש חשבונית על ארוחה" -> workerName: "משה כהן", category: "food"

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
      const formSchema = capabilities.formSchema;
      
      console.log('[LangChainAgent] MCP capabilities:', {
        name: capabilities.name,
        requiredFields,
        formSchemaFields: formSchema?.fields?.length || 0,
        requirementsExists: !!capabilities.requirements
      });
      
      // Use detailed formSchema fields if available, otherwise fall back to requiredFields
      let fields: any[];
      if (formSchema?.fields && Array.isArray(formSchema.fields) && formSchema.fields.length > 0) {
        // Use the detailed field definitions from MCP formSchema
        fields = formSchema.fields;
        console.log('[LangChainAgent] Using detailed MCP formSchema fields:', fields.map((f: any) => f.name));
      } else {
        // Fall back to simple field names from requiredFields
        fields = Array.isArray(requiredFields) ? requiredFields : [];
        console.log('[LangChainAgent] Using simple requiredFields:', fields);
      }
      
      formData = {
        title: capabilities.name,
        description: capabilities.description,
        fields,
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
      // Normalize extracted data to match MCP schema field names
      // This ensures fields like 'origin' -> 'departureCity', 'destination' -> 'destinationCity', etc.
      const normalizedData = this.normalizeDataForMcpSchema(extractedData);
      console.log('[LangChainAgent] Extracted data:', extractedData);
      console.log('[LangChainAgent] Normalized data for MCP schema:', normalizedData);
      await this.sessionService.setExtractedData(session, normalizedData);
    }

    const updatedSession = await this.sessionService.getSession(session.id);
    if (!updatedSession) {
      throw new Error('Session not found after creation');
    }

    // For invoice submissions, show file upload dialog first to extract data via OCR
    // before asking any clarifying questions
    if (intent === IntentType.INVOICE_SUBMISSION && !updatedSession.extractedData?.ocrProcessed) {
      console.log('[LangChainAgent] Invoice detected - requesting file upload for OCR');
      this.emitEvent(eventCallback, 'file_upload_request', {
        sessionId: updatedSession.id,
        message: 'Please upload your invoice/receipt to extract details automatically',
        accept: 'image/*,application/pdf',
        endpoint: '/api/v1/ocr/invoice',
      });
      
      return this.sessionService.buildSessionResponse(updatedSession, 'file_upload', {
        message: 'Please upload your invoice/receipt to extract details automatically',
        accept: 'image/*,application/pdf',
        endpoint: '/api/v1/ocr/invoice',
      });
    }

    if (complexity === ComplexityLevel.SIMPLE && this.sessionService.isSessionComplete(updatedSession)) {
      this.emitEvent(eventCallback, 'generating', { message: 'Generating form...' });
      const rawFormOutput = await this.generateOutput(request.userInput, intent, complexity, updatedSession.model);
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
    const rawFormOutput = await this.generateOutput(request.userInput, intent, complexity, updatedSession.model);
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

    // Handle OCR processed response from file upload
    if (request.answer.startsWith('OCR_PROCESSED:')) {
      const ocrDataJson = request.answer.substring('OCR_PROCESSED:'.length);
      try {
        const ocrData = JSON.parse(ocrDataJson);
        console.log('[LangChainAgent] OCR data received:', ocrData);
        
        // Flatten enrichedFields if present (OCR response may have nested structure)
        // This ensures fields like invoiceNumber are at the top level
        const flatOcrData = ocrData.enrichedFields ? { ...ocrData.enrichedFields } : ocrData;
        console.log('[LangChainAgent] Flattened OCR data:', flatOcrData);
        
        // Merge OCR data into extracted data
        const existingData = session.extractedData || {};
        const mergedData = { ...existingData, ...flatOcrData, ocrProcessed: true };
        await this.sessionService.setExtractedData(session, mergedData);
        
        this.emitEvent(eventCallback, 'analyzing', { message: 'Invoice data extracted. Checking for missing information...' });
      } catch (e) {
        console.error('[LangChainAgent] Failed to parse OCR data:', e);
      }
    }

    // Handle skip file upload
    if (request.answer === 'SKIP_FILE_UPLOAD') {
      console.log('[LangChainAgent] User skipped file upload');
      const existingData = session.extractedData || {};
      await this.sessionService.setExtractedData(session, { ...existingData, ocrProcessed: true });
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
      const rawFormOutput = await this.generateOutput(userInput, updatedSession.intent, updatedSession.complexity, updatedSession.model);
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
    const rawFormOutput = await this.generateOutput(userInput, updatedSession.intent, updatedSession.complexity, updatedSession.model);
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
        const value = this.getValueForField(key, data);
        if (key && value != null && value !== '') {
          field.defaultValue = value;
        }
      }
    }

    // Handle web component mode - inject data into component.data
    // This is what the frontend reads to populate form fields
    const component = output.component as Record<string, unknown> | undefined;
    if (component) {
      // Normalize the data for web component as well
      const normalizedData = this.normalizeDataForMcpSchema(data);
      component.data = normalizedData;
      console.log('[LangChainAgent] Injected data into web component:', Object.keys(normalizedData).filter(k => normalizedData[k]));
    }

    console.log('[LangChainAgent] Applied defaults to form output:', {
      fieldsWithDefaults: schema?.fields ? (schema.fields as Array<Record<string, unknown>>).filter(f => f.defaultValue).map(f => f.name) : [],
      dataKeys: Object.keys(data).filter(k => data[k])
    });

    return output;
  }

  /**
   * Get value for a field, with fallback to aliased field names
   * Maps old extraction field names to new MCP schema field names
   */
  private getValueForField(fieldName: string, data: Record<string, unknown>): unknown {
    // First, try direct match
    let value = data[fieldName];
    if (value != null && value !== '') {
      return value;
    }

    // Field name aliases: MCP schema field -> extraction field aliases
    const fieldAliases: Record<string, string[]> = {
      // Travel MCP schema fields -> extraction aliases
      'destinationCity': ['destination', 'arrivalCity'],
      'departureCity': ['origin', 'departureCity'],
      'departureDate': ['startDate', 'departureDate'],
      'returnDate': ['endDate', 'returnDate'],
      'hotelDetails': ['hotel'],
      'departureFlightNumber': ['departureFlightNumber'],
      'returnFlightNumber': ['returnFlightNumber'],
      'travelersNames': ['travelers', 'travelersNames'],
      'workerName': ['workerName', 'name'],
      // Invoice MCP schema fields -> extraction aliases
      'invoiceDetails': ['purpose', 'description'],
      'invoiceDate': ['date', 'invoiceDate'],
      'expenseType': ['category', 'expenseType'],
      'invoiceNumber': ['invoiceNumber'],
      'amount': ['amount'],
      'vendor': ['vendor'],
      'currency': ['currency'],
    };

    // Try aliases
    const aliases = fieldAliases[fieldName];
    if (aliases) {
      for (const alias of aliases) {
        if (data[alias] != null && data[alias] !== '') {
          console.log(`[LangChainAgent] Field mapping: ${fieldName} <- ${alias}`);
          return data[alias];
        }
      }
    }

    // Special handling for flight numbers - parse from 'flights' field
    if (fieldName === 'departureFlightNumber' && data['flights']) {
      const flights = String(data['flights']);
      const flightCodes = flights.match(/[A-Z]{2}\d+/gi);
      if (flightCodes && flightCodes.length > 0) {
        console.log(`[LangChainAgent] Parsed departure flight: ${flightCodes[0]} from flights: ${flights}`);
        return flightCodes[0];
      }
    }

    if (fieldName === 'returnFlightNumber' && data['flights']) {
      const flights = String(data['flights']);
      const flightCodes = flights.match(/[A-Z]{2}\d+/gi);
      if (flightCodes && flightCodes.length > 1) {
        console.log(`[LangChainAgent] Parsed return flight: ${flightCodes[1]} from flights: ${flights}`);
        return flightCodes[1];
      }
    }

    return value;
  }

  /**
   * Normalize data object to include both old and new field names
   * for web component compatibility
   */
  private normalizeDataForMcpSchema(data: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...data };

    // Travel MCP schema field mappings
    if (data['destination'] && !normalized['destinationCity']) {
      normalized['destinationCity'] = data['destination'];
    }
    if (data['origin'] && !normalized['departureCity']) {
      normalized['departureCity'] = data['origin'];
    }
    if (data['hotel'] && !normalized['hotelDetails']) {
      normalized['hotelDetails'] = data['hotel'];
    }
    if (data['travelers'] && !normalized['travelersNames']) {
      normalized['travelersNames'] = data['travelers'];
    }

    // Parse flight numbers from 'flights' field
    if (data['flights']) {
      const flights = String(data['flights']);
      const flightCodes = flights.match(/[A-Z]{2}\d+/gi);
      if (flightCodes) {
        if (flightCodes.length > 0 && !normalized['departureFlightNumber']) {
          normalized['departureFlightNumber'] = flightCodes[0];
        }
        if (flightCodes.length > 1 && !normalized['returnFlightNumber']) {
          normalized['returnFlightNumber'] = flightCodes[1];
        }
      }
    }

    // Travel date field mappings
    if (data['startDate'] && !normalized['departureDate']) {
      normalized['departureDate'] = data['startDate'];
    }
    if (data['endDate'] && !normalized['returnDate']) {
      normalized['returnDate'] = data['endDate'];
    }

    // Invoice MCP schema field mappings
    if (data['purpose'] && !normalized['invoiceDetails']) {
      normalized['invoiceDetails'] = data['purpose'];
    }
    if (data['category'] && !normalized['expenseType']) {
      normalized['expenseType'] = data['category'];
    }
    if (data['date'] && !normalized['invoiceDate']) {
      normalized['invoiceDate'] = data['date'];
    }

    return normalized;
  }
}
