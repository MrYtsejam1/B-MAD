# B-MAD Generative UI Architecture Plan
## LangChain Agents + Anthropic MCP Protocol + Hugging Face Models

**Version**: 2.0  
**Date**: December 5, 2025  
**Status**: Planning Phase - Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Components](#architecture-components)
4. [User Scenarios](#user-scenarios)
5. [Technical Specifications](#technical-specifications)
6. [Implementation Phases](#implementation-phases)
7. [API Specifications](#api-specifications)
8. [Security & Compliance](#security--compliance)
9. [Testing Strategy](#testing-strategy)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### What We're Building

An intelligent form generation system that combines:
- **LangChain Agents** for conversational AI workflows
- **Anthropic MCP Protocol** for business domain integration
- **Hugging Face Models** for AI-powered form generation
- **OCR Technology** for receipt processing
- **Web Component Generation** for custom UI creation

### Key Capabilities

1. **Intelligent Form Generation**: AI analyzes user requests and generates appropriate forms
2. **Conversational UX**: Agent asks clarifying questions (max 3) when needed
3. **Business Workflow Integration**: MCP servers provide domain-specific logic
4. **Dual Output Modes**: JSON schemas OR custom web components
5. **OCR-Assisted Data Entry**: Optional receipt upload with automatic extraction
6. **Multi-Step Workflows**: Complex processes like travel planning
7. **Real-Time Updates**: Server-Sent Events for live agent communication

### Three Operating Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Demo Mode** | Mock responses, no API calls | Quick testing, demonstrations |
| **Real AI Mode** | HF models generate custom forms | General form creation |
| **MCP Mode** | HF models + MCP servers | Business workflows (invoice, travel) |

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                       │
│  • Model Selection: [DeepCoder ▼]                      │
│  • Scenario: [Auto-detect ▼]                           │
│  • Mode: Chat / Wizard                                  │
│  • Data Source: Mock / Live                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              LangChain Agent Layer                      │
│  ┌───────────────────────────────────────────────┐     │
│  │   Hugging Face Inference Models               │     │
│  │   • DeepCoder-14B-Preview (Featherless AI)   │     │
│  │   • GLM-4-32B-0414 (Featherless AI)          │     │
│  │   • Qwen2.5-Coder-7B-Instruct (Featherless)  │     │
│  │                                                │     │
│  │   Powers:                                      │     │
│  │   - Intent detection                           │     │
│  │   - Question generation                        │     │
│  │   - Form schema generation                     │     │
│  │   - Web component generation (coder models)   │     │
│  │   - Schema repair                              │     │
│  └───────────────────────────────────────────────┘     │
│                                                          │
│  Agent Tools:                                           │
│  • mcp.describe() - Get MCP server capabilities        │
│  • mcp.validate() - Validate against MCP schemas       │
│  • mcp.call() - Execute MCP operations                 │
│  • ocr.process() - Extract text from receipts          │
│  • docs.fetch() - Get passport/payment info            │
│  • nlp.extract() - Extract invoice details from text   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  MCP Gateway                            │
│  • Server discovery (Anthropic MCP Protocol)           │
│  • Capability metadata                                  │
│  • Mock/Live routing                                    │
│  • Request validation                                   │
│  • Component compilation (for coder models)            │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│  Invoice Server  │    │  Travel Server   │
│  (MCP Protocol)  │    │  (MCP Protocol)  │
│                  │    │                  │
│  • Resources     │    │  • Resources     │
│  • Tools         │    │  • Tools         │
│  • Prompts       │    │  • Prompts       │
│  • Mock APIs     │    │  • Mock APIs     │
└──────────────────┘    └──────────────────┘
```

### Component Interaction Flow

```
User Request: "I need to submit an invoice for yesterday's client lunch"
    ↓
┌─────────────────────────────────────────────┐
│   LangChain Agent (Powered by HF Model)     │
│   Step 1: Intent Detection                  │
│   → Analyzes: "invoice submission"          │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│   MCP Server Selection                      │
│   → Selects: invoice-server                 │
│   → Loads: capabilities, requirements       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│   Complexity Analysis                       │
│   → User mentioned: date, purpose           │
│   → Missing: amount, category               │
│   → Decision: Ask questions                 │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│   Question Generation (HF Model)            │
│   Q1: "What was the total amount?"          │
│   Q2: "Category: meals, travel, supplies?"  │
│   Q3: "Do you have a receipt to upload?"    │
└─────────────────┬───────────────────────────┘
                  ↓
        User Answers Questions
                  ↓
┌─────────────────────────────────────────────┐
│   Form Generation (HF Model)                │
│   → If GLM-4: Generate JSON schema          │
│   → If Qwen/DeepCoder: Generate component   │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│   Validation (MCP Server)                   │
│   → Validate against JSON Schema            │
│   → If errors: HF model repairs              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│   Submission (MCP Server)                   │
│   → POST /mock/invoices/submit              │
│   → Returns: workflow status                │
└─────────────────────────────────────────────┘
```

---

## Architecture Components

### 1. Hugging Face Models

#### Model Capabilities Matrix

| Model | Size | Specialty | Output Type | Best For |
|-------|------|-----------|-------------|----------|
| **DeepCoder-14B-Preview** | 14B | Code generation | Web components | Enterprise forms, complex UI |
| **GLM-4-32B-0414** | 32B | Reasoning | JSON schemas | Complex logic, workflows |
| **Qwen2.5-Coder-7B-Instruct** | 7B | Fast coding | Web components | Quick forms, simple UI |

#### Model Usage Patterns

**Intent Detection** (All Models):
```javascript
const prompt = `Classify this request into one of these categories:
- invoice: expense/invoice submission
- travel: trip planning/booking
- custom: general form creation

User request: "${userInput}"

Respond with just the category name.`;
```

**JSON Schema Generation** (GLM-4):
```javascript
const prompt = `Generate a form schema for invoice submission.

MCP Template: ${JSON.stringify(mcpTemplate)}
User Requirements: ${JSON.stringify(userAnswers)}

Generate a complete form schema in JSON format.`;
```

**Web Component Generation** (Qwen/DeepCoder):
```javascript
const prompt = `You are an expert Angular developer. Generate a complete component.

Requirements:
- Component name: InvoiceFormComponent
- Fields: ${JSON.stringify(requiredFields)}
- Features: validation, OCR upload, responsive design
- Style: Material Design

Generate complete component with @Component decorator, TypeScript class, template, and styles.`;
```

### 2. LangChain Agent

#### Agent Architecture

**Agent Type**: ReAct-style (Reasoning + Acting)
- Text-based tool invocation
- No dependency on function-calling support
- Works with all HF models

**Agent Tools**:

1. **mcp.describe(serverId)**
   - Returns: Server capabilities, resources, tools, prompts
   - Used for: Understanding what a server can do

2. **mcp.validate(serverId, operation, payload)**
   - Returns: Validation result, errors
   - Used for: Pre-submission validation

3. **mcp.call(serverId, operation, payload)**
   - Returns: Operation result
   - Used for: Executing MCP operations

4. **mcp.workflow(serverId, flowId, step)**
   - Returns: Next step requirements
   - Used for: Multi-step workflows

5. **ocr.process(file)**
   - Returns: Extracted text, structured data
   - Used for: Receipt processing

6. **nlp.extract(description)**
   - Returns: Structured invoice data
   - Used for: Manual entry without receipt

7. **docs.fetch(type)**
   - Returns: User documents (passport, payment methods)
   - Used for: Travel planning

#### Agent Decision Flow

```
User Input
    ↓
Intent Classification
    ↓
MCP Server Selection
    ↓
Load Server Capabilities
    ↓
Complexity Analysis
    ↓
├─ Simple (score ≤ 7)
│   ↓
│   Generate Form Immediately
│   ↓
│   Validate & Submit
│
└─ Complex (score > 7)
    ↓
    Identify Gaps (max 3)
    ↓
    Generate Questions
    ↓
    Collect Answers
    ↓
    Generate Form
    ↓
    Validate & Repair (if needed)
    ↓
    Submit
```

#### Complexity Scoring Algorithm

```javascript
function calculateComplexity(description, mcpRequirements) {
  let score = 0;
  
  // Ambiguous terms (+2 each)
  const ambiguous = ['comprehensive', 'complete', 'full', 'enterprise'];
  score += countMatches(description, ambiguous) * 2;
  
  // Multiple domains (+3 each)
  const domains = ['billing', 'shipping', 'payment', 'account'];
  score += countMatches(description, domains) * 3;
  
  // Conditional logic (+4)
  const conditional = ['if', 'when', 'depending', 'conditional'];
  score += countMatches(description, conditional) * 4;
  
  // Missing required fields (+2 per field)
  const missingFields = mcpRequirements.requiredFields.filter(
    field => !description.includes(field)
  );
  score += missingFields.length * 2;
  
  return Math.min(score, 10); // Cap at 10
}
```

### 3. Anthropic MCP Protocol

#### MCP Server Structure

Each MCP server follows Anthropic's specification:

```json
{
  "name": "server-name",
  "version": "1.0.0",
  "description": "Server description",
  "capabilities": {
    "resources": true,
    "tools": true,
    "prompts": true
  },
  "resources": [
    {
      "uri": "resource://path",
      "name": "Resource Name",
      "mimeType": "application/json",
      "description": "Resource description"
    }
  ],
  "tools": [
    {
      "name": "tool_name",
      "description": "Tool description",
      "inputSchema": {
        "type": "object",
        "properties": { /* ... */ },
        "required": [ /* ... */ ]
      }
    }
  ],
  "prompts": [
    {
      "name": "prompt_name",
      "description": "Prompt description",
      "arguments": [
        {
          "name": "arg_name",
          "description": "Argument description",
          "required": true
        }
      ]
    }
  ]
}
```

#### MCP Gateway

**Responsibilities**:
- Load and manage MCP server configurations
- Route requests to appropriate servers
- Handle mock/live mode switching
- Validate requests against JSON Schemas
- Compile web components (for coder models)
- Manage authentication (in live mode)

**Configuration File**: `config/servers.mcp.json`

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
      "operations": [ /* ... */ ],
      "workflow": { /* ... */ },
      "formTemplate": { /* ... */ }
    }
  ]
}
```

### 4. OCR & Document Processing

#### Receipt OCR Flow

```
User uploads receipt image
    ↓
Backend receives file (multipart/form-data)
    ↓
Validate file (type, size, malware scan)
    ↓
Store in /uploads/receipts/{receiptId}.{ext}
    ↓
OCR Processing (Tesseract.js)
    ↓
Extract structured data:
  - Vendor name
  - Date
  - Total amount
  - Currency
  - Line items
  - Tax amount
  - Payment method
    ↓
Validate extracted data:
  - Date not in future
  - Amount > 0
  - Currency is valid ISO code
    ↓
Store OCR result: {receiptId}.ocr.json
    ↓
Return to frontend:
  {
    receiptId: "RCP-001",
    extractedData: { /* ... */ },
    confidence: 0.92,
    imageUrl: "/uploads/receipts/RCP-001.jpg"
  }
    ↓
Frontend pre-fills form fields
    ↓
User reviews and confirms/edits
    ↓
Submit to MCP server
```

#### NLP Extraction (No Receipt)

```
User describes invoice: "I spent $45.50 on client lunch yesterday"
    ↓
NLP Extraction Tool
    ↓
Extract entities:
  - Amount: 45.50
  - Currency: USD (inferred)
  - Date: yesterday (relative date)
  - Purpose: client lunch
  - Category: meals (inferred)
    ↓
Validate extracted data
    ↓
Generate clarifying questions for missing fields
    ↓
User answers questions
    ↓
Generate form with all data
```

#### Document APIs (Travel)

**Passport API**:
```javascript
GET /mock/travel/user/passport
→ {
    passportNumber: "P12345678",
    fullName: "John Doe",
    nationality: "USA",
    dateOfBirth: "1985-03-15",
    expiryDate: "2030-06-20",
    imageUrl: "/mock/documents/passport-001.jpg"
  }
```

**Payment Methods API**:
```javascript
GET /mock/travel/user/payment-methods
→ [
    {
      cardId: "CARD-001",
      type: "CORPORATE_AMEX",
      last4: "1234",
      expiryDate: "2027-12",
      cardholderName: "John Doe"
    }
  ]
```

### 5. Web Component Generation

#### Dual Output System

**Mode A: JSON Schema** (GLM-4 Model)
```
HF Model generates JSON
    ↓
{
  "title": "Invoice Form",
  "fields": [
    { "name": "amount", "type": "number", "label": "Amount" }
  ]
}
    ↓
Generic Form Renderer
    ↓
Standard UI (current system)
```

**Mode B: Web Component** (Qwen/DeepCoder Models)
```
HF Model generates Angular component
    ↓
@Component({
  selector: 'app-invoice-form',
  template: `<div>...</div>`,
  styles: [`...`]
})
export class InvoiceFormComponent { }
    ↓
Component Compiler Service
    ↓
Compile TypeScript → JavaScript
    ↓
Send to frontend
    ↓
Dynamic Component Loader
    ↓
Render custom component
    ↓
Branded, custom UI
```

#### Component Compiler Service

**Backend Service**:
```javascript
class ComponentCompilerService {
  async compile(componentCode: string): Promise<CompiledComponent> {
    // Parse component code
    const parsed = this.parseComponent(componentCode);
    
    // Compile TypeScript
    const js = await this.compileTypeScript(parsed.class);
    
    // Process template
    const template = this.processTemplate(parsed.template);
    
    // Process styles
    const styles = this.processStyles(parsed.styles);
    
    // Return compiled component
    return {
      js,
      template,
      styles,
      metadata: {
        componentName: parsed.name,
        selector: parsed.selector,
        inputs: parsed.inputs,
        outputs: parsed.outputs
      }
    };
  }
}
```

**Frontend Dynamic Loader**:
```javascript
class DynamicComponentLoader {
  async loadComponent(compiled: CompiledComponent): Promise<ComponentRef> {
    // Create component class
    const componentClass = this.createComponentClass(compiled);
    
    // Create module
    const module = this.createModule(componentClass);
    
    // Compile
    const factory = this.compiler.compileModuleAndAllComponentsSync(module);
    
    // Create and inject
    return this.viewContainer.createComponent(
      factory.componentFactories[0]
    );
  }
}
```

---

## User Scenarios

### Scenario 1: Invoice Submission

#### Use Case
Employee needs to submit an expense invoice for reimbursement.

#### User Flow Options

**Option A: Manual Entry (No Receipt)**
```
1. User: "I need to submit an invoice for yesterday's client lunch, $45.50"

2. Agent (NLP Extraction):
   - Date: yesterday → 2025-12-04
   - Amount: $45.50
   - Currency: USD (inferred)
   - Purpose: client lunch
   - Category: meals (inferred)

3. Agent: "I've extracted these details. Should I categorize this as 'Meals & Entertainment'?"

4. User: "Yes"

5. Agent generates form (pre-filled)

6. User reviews and submits

7. MCP Server: POST /mock/invoices/submit
   → Returns: invoiceId, workflow status

8. User sees approval workflow:
   ✓ Submitted
   ⏳ Pending Manager Approval
   ○ Finance Approval
   ○ Reimbursement
```

**Option B: Receipt Upload (OCR)**
```
1. User: "I need to submit an invoice" [uploads receipt image]

2. OCR Processing:
   - Vendor: Starbucks Coffee
   - Date: 2025-12-04
   - Amount: $45.50
   - Currency: USD
   - Items: Latte x2 ($12.00), Sandwich ($3.50)

3. Agent: "I extracted these details from your receipt. What was the business purpose?"

4. User: "Client lunch"

5. Agent: "Should I categorize this as 'Meals & Entertainment'?"

6. User: "Yes"

7. Form generated with OCR data + user input

8. Submit to MCP server

9. Workflow tracking
```

**Option C: Hybrid (Description + Receipt)**
```
1. User: "Client lunch yesterday for $45" [uploads receipt]

2. Agent:
   - Extracts from description: date, purpose, approximate amount
   - Extracts from receipt: exact amount, vendor, items

3. Agent validates:
   - User said $45, receipt shows $45.50
   - ✓ Amounts match (within tolerance)

4. Agent: "Receipt confirms $45.50 at Starbucks. Category: Meals & Entertainment?"

5. User: "Yes"

6. Form generated with validated data

7. Submit
```

#### MCP Server: Invoice

**Resources**:
- `invoice://templates/expense` - Expense invoice template
- `invoice://policies/expense-policy` - Company expense policy

**Tools**:
- `upload_receipt` - Upload and OCR process receipt
- `submit_invoice` - Submit invoice for approval
- `check_status` - Check approval status

**Workflow**:
```
DRAFT → SUBMITTED → MANAGER_APPROVED → FINANCE_APPROVED → REIMBURSED
```

**Required Fields**:
- date
- amount
- currency
- purpose
- category
- receipt (optional)

### Scenario 2: Business Trip Planning

#### Use Case
Employee needs to plan a business trip with flights, hotels, and co-workers.

#### User Flow

```
1. User: "I need to plan a business trip to London for 3 people next month"

2. Agent (Intent Detection):
   → Travel planning

3. Agent (Complexity Analysis):
   - Multiple travelers: +3
   - Multiple domains (flights, hotels): +3
   - Date ambiguous ("next month"): +2
   - Score: 8/10 → Complex, ask questions

4. Agent Q1: "What are the exact dates (departure and return)?"
   User: "January 15-20, 2026"

5. Agent Q2: "Who are the 3 travelers (names/emails)?"
   User: "Me, john.smith@company.com, jane.doe@company.com"

6. Agent Q3: "What's your budget range and preferred hotel class?"
   User: "Up to $5000 total, 4-star hotels near city center"

7. Agent loads MCP server capabilities:
   - get_user_passport (from API)
   - get_payment_methods (from API)
   - search_flights (mock data)
   - search_hotels (mock data)

8. Agent generates multi-step wizard:
   
   Step 1: Trip Details
   - Destination: London, UK
   - Dates: Jan 15-20, 2026
   - Purpose: [input]
   - Budget: $5000
   
   Step 2: Flight Selection
   - [Agent calls search_flights]
   - Shows 3 options
   - User selects preferred flight
   
   Step 3: Hotel Selection
   - [Agent calls search_hotels]
   - Shows 5 options near city center
   - User selects hotel
   
   Step 4: Travelers
   - User 1: [auto-filled from passport API]
   - User 2: john.smith@company.com
   - User 3: jane.doe@company.com
   
   Step 5: Payment
   - [Agent calls get_payment_methods]
   - Shows corporate card
   - User selects payment method
   
   Step 6: Review & Confirm
   - Total: $4,850
   - Breakdown: Flights $2,550, Hotels $2,100, Taxes $200
   - [Prepare booking payload button]

9. Agent: prepare_booking_payload
   → Returns JSON payload for human confirmation

10. User reviews payload

11. Submit for approval workflow:
    ✓ Trip Created
    ⏳ Pending Budget Approval
    ○ Booking
    ○ Confirmation
    ○ Notifications Sent
```

#### MCP Server: Travel

**Resources**:
- `travel://templates/business-trip` - Business trip template
- `travel://policies/travel-policy` - Company travel policy
- `travel://user/passport` - User passport info (from API)
- `travel://user/payment-methods` - Payment methods (from API)

**Tools**:
- `create_trip` - Initialize trip
- `search_flights` - Search available flights (mock)
- `search_hotels` - Search hotels (mock)
- `add_traveler` - Add co-worker
- `get_user_passport` - Fetch passport from API
- `get_payment_methods` - Fetch payment methods from API
- `prepare_booking_payload` - Generate booking JSON

**Workflow**:
```
PLANNING → BUDGET_APPROVAL → BOOKING → CONFIRMED → COMPLETED
```

**Sub-Workflows**:
- Flights: search → select → add to trip
- Hotels: search → select → add to trip
- Travelers: lookup → validate → add to trip

---

## Technical Specifications

### Technology Stack

#### Backend

```json
{
  "dependencies": {
    "@huggingface/inference": "^4.13.4",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@langchain/core": "^0.1.0",
    "@langchain/community": "^0.1.0",
    "express": "^4.18.2",
    "typescript": "^5.3.3",
    "zod": "^3.22.4",
    "ioredis": "^5.8.2",
    "tesseract.js": "^5.0.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0",
    "pdf-parse": "^1.1.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "winston": "^3.11.0"
  }
}
```

#### Frontend

```json
{
  "dependencies": {
    "@angular/core": "^17.0.0",
    "@angular/material": "^17.0.0",
    "rxjs": "^7.8.0",
    "typescript": "^5.3.3"
  }
}
```

### Environment Configuration

```env
# Hugging Face
HF_TOKEN=your_token_here

# MCP Servers
MCP_MODE=mock  # or live
MCP_INVOICE_SERVER_URL=http://localhost:3001/mcp/invoice
MCP_TRAVEL_SERVER_URL=http://localhost:3001/mcp/travel

# File Upload
UPLOAD_DIR=/uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# OCR
OCR_LANGUAGE=eng
OCR_CONFIDENCE_THRESHOLD=0.7
OCR_PROVIDER=tesseract

# Session
SESSION_TTL_SECONDS=7200  # 2 hours
SSE_HEARTBEAT_INTERVAL=30000  # 30 seconds

# Agent
AI_AGENTIC_MODE=true
AI_COMPLEXITY_THRESHOLD=7
AI_MAX_QUESTIONS=3

# LangChain
LANGCHAIN_TRACING=true
LANGCHAIN_API_KEY=optional
```

### Database Schema

#### Sessions (Redis)

```typescript
interface Session {
  sessionId: string;
  userId: string;
  mode: 'chat' | 'wizard';
  scenario: 'invoice' | 'travel' | 'custom';
  messages: Message[];
  intent: string;
  gaps: Gap[];
  currentStep: number;
  maxSteps: number;
  mcpServerId: string;
  createdAt: string;
  expiresAt: string;
}
```

#### Uploads (File System)

```
uploads/
├── receipts/
│   ├── {receiptId}.jpg
│   └── {receiptId}.ocr.json
├── travel-docs/
│   └── {docId}.pdf
└── misc/
    └── {docId}.{ext}
```

### API Endpoints

#### Session Management

```
POST /api/v1/ai/session/start
Body: {
  description: string,
  mode: 'chat' | 'wizard',
  scenario?: 'invoice' | 'travel' | 'auto'
}
Response: {
  sessionId: string,
  complexity: 'high' | 'low',
  action: 'generate' | 'clarify',
  question?: string,
  form?: FormSchema
}

POST /api/v1/ai/session/message
Body: {
  sessionId: string,
  answer: string
}
Response: {
  action: 'clarify' | 'generate',
  question?: string,
  questionNumber?: number,
  maxQuestions: number,
  form?: FormSchema | WebComponent
}

GET /api/v1/ai/session/stream?sessionId={id}
SSE Events:
  - analyzing
  - question
  - generating
  - complete
```

#### File Upload

```
POST /api/v1/upload/receipt
Content-Type: multipart/form-data
Body: {
  file: File
}
Response: {
  receiptId: string,
  extractedData: {
    vendor: string,
    date: string,
    amount: number,
    currency: string,
    items: Array<{
      description: string,
      quantity: number,
      price: number
    }>,
    total: number,
    taxAmount: number
  },
  confidence: number,
  imageUrl: string
}
```

#### MCP Operations

```
POST /api/v1/mcp/{serverId}/call
Body: {
  operation: string,
  payload: object
}
Response: {
  result: object
}

GET /api/v1/mcp/{serverId}/describe
Response: {
  name: string,
  version: string,
  capabilities: object,
  resources: Array<Resource>,
  tools: Array<Tool>,
  prompts: Array<Prompt>
}
```

---

## Implementation Phases

### Phase 1: MCP Foundation + OCR (Weeks 1-2)

**Goals**:
- Set up Anthropic MCP SDK
- Create invoice MCP server (mock)
- Implement OCR service
- Add NLP extraction for manual entry
- File upload handling

**Deliverables**:
- MCP Gateway module
- Invoice MCP server configuration
- Mock invoice APIs
- OCR service (Tesseract.js)
- NLP extraction tool
- File upload endpoints

**Testing**:
- Upload receipt → OCR → Extract data
- Manual entry → NLP → Extract data
- Submit invoice → Mock API → Workflow status

### Phase 2: LangChain + MCP Integration (Weeks 2-3)

**Goals**:
- Install LangChain packages
- Create MCP-aware agent
- Implement agent tools
- Intent detection and routing
- Gap analysis and question generation

**Deliverables**:
- LangChain agent setup
- Agent tools (mcp.*, ocr.*, nlp.*)
- Intent classifier
- Complexity scorer
- Question generator
- Session management (Redis)

**Testing**:
- User request → Intent detection → MCP server selection
- Complex request → Questions → Answers → Form generation
- Simple request → Immediate form generation

### Phase 3: Web Component Generation (Weeks 3-4)

**Goals**:
- Component compiler service
- Dynamic component rendering
- Model-specific prompts
- Coder model integration

**Deliverables**:
- Component compiler service
- Dynamic component loader (frontend)
- Qwen/DeepCoder prompts
- Model capability detection
- Component validation

**Testing**:
- Qwen model → Generate component → Compile → Render
- DeepCoder model → Generate component → Compile → Render
- GLM model → Generate JSON → Generic renderer

### Phase 4: Travel MCP Server (Weeks 4-5)

**Goals**:
- Travel MCP server (mock)
- Multi-step workflow
- Document APIs (passport, payment)
- Flight/hotel search (mock)
- Booking payload preparation

**Deliverables**:
- Travel MCP server configuration
- Mock travel APIs
- Document API mocks
- Multi-step wizard UI
- Booking payload generator

**Testing**:
- Full travel planning flow
- Multi-step form generation
- Document fetching
- Booking payload creation

### Phase 5: UI & Polish (Weeks 5-6)

**Goals**:
- Dual UI modes (Chat + Wizard)
- Scenario selector
- Model selection with capabilities
- Workflow status tracker
- SSE for real-time updates

**Deliverables**:
- Chat-style interface
- Wizard-style interface
- Scenario selector dropdown
- Model selection UI
- Workflow tracker component
- SSE implementation
- Error handling
- Loading states

**Testing**:
- Chat mode end-to-end
- Wizard mode end-to-end
- SSE reconnection
- Error scenarios
- Mobile responsiveness

---

## API Specifications

### Mock Invoice APIs

```javascript
// Upload and OCR receipt
POST /mock/invoices/upload-receipt
Content-Type: multipart/form-data
→ {
    receiptId: "RCP-001",
    extractedData: {
      vendor: "Starbucks Coffee",
      date: "2025-12-04",
      amount: 45.50,
      currency: "USD",
      items: [
        { description: "Latte", quantity: 2, price: 12.00 },
        { description: "Sandwich", quantity: 1, price: 3.50 }
      ],
      total: 45.50,
      taxAmount: 3.64
    },
    confidence: 0.92,
    imageUrl: "/uploads/receipts/RCP-001.jpg"
  }

// Submit invoice
POST /mock/invoices/submit
{
  "date": "2025-12-04",
  "amount": 45.50,
  "currency": "USD",
  "purpose": "Client meeting",
  "category": "meals",
  "receiptId": "RCP-001",
  "notes": "Coffee with potential client"
}
→ {
    invoiceId: "INV-001",
    status: "PENDING_MANAGER",
    submittedAt: "2025-12-05T15:23:00Z",
    approvalChain: [
      { role: "MANAGER", name: "John Smith", status: "PENDING" },
      { role: "FINANCE", name: "Jane Doe", status: "WAITING" }
    ],
    estimatedReimbursement: "2025-12-15"
  }

// Check status
GET /mock/invoices/status?id=INV-001
→ {
    invoiceId: "INV-001",
    status: "MANAGER_APPROVED",
    timeline: [
      {
        step: "SUBMITTED",
        timestamp: "2025-12-05T15:23:00Z",
        by: "user@company.com"
      },
      {
        step: "MANAGER_APPROVED",
        timestamp: "2025-12-05T16:45:00Z",
        by: "john.smith@company.com",
        comment: "Approved"
      },
      {
        step: "PENDING_FINANCE",
        timestamp: "2025-12-05T16:45:00Z"
      }
    ]
  }
```

### Mock Travel APIs

```javascript
// Get user passport
GET /mock/travel/user/passport
→ {
    passportNumber: "P12345678",
    fullName: "John Doe",
    nationality: "USA",
    dateOfBirth: "1985-03-15",
    expiryDate: "2030-06-20",
    imageUrl: "/mock/documents/passport-001.jpg"
  }

// Get payment methods
GET /mock/travel/user/payment-methods
→ [
    {
      cardId: "CARD-001",
      type: "CORPORATE_AMEX",
      last4: "1234",
      expiryDate: "2027-12",
      cardholderName: "John Doe"
    }
  ]

// Create trip
POST /mock/travel/trips/create
{
  "destination": "London, UK",
  "departureDate": "2026-01-15",
  "returnDate": "2026-01-20",
  "purpose": "Client meetings",
  "budget": 5000,
  "currency": "USD"
}
→ {
    tripId: "TRIP-001",
    status: "PLANNING",
    createdAt: "2025-12-05T15:23:00Z"
  }

// Search flights
POST /mock/travel/trips/search-flights
{
  "tripId": "TRIP-001",
  "from": "JFK",
  "to": "LHR",
  "departureDate": "2026-01-15",
  "returnDate": "2026-01-20",
  "passengers": 3,
  "class": "ECONOMY"
}
→ {
    flights: [
      {
        flightId: "FLT-001",
        airline: "British Airways",
        flightNumber: "BA178",
        departure: { airport: "JFK", time: "2026-01-15T20:00:00Z" },
        arrival: { airport: "LHR", time: "2026-01-16T08:00:00Z" },
        price: 850,
        currency: "USD",
        class: "ECONOMY",
        available: true
      }
    ]
  }

// Prepare booking payload
POST /mock/travel/trips/prepare-booking
{
  "tripId": "TRIP-001",
  "selectedFlightIds": ["FLT-001"],
  "selectedHotelId": "HTL-001",
  "travelers": ["user@company.com", "colleague1@company.com"],
  "paymentMethodId": "CARD-001"
}
→ {
    bookingPayload: {
      tripId: "TRIP-001",
      totalCost: 4850,
      currency: "USD",
      breakdown: {
        flights: 2550,
        hotels: 2100,
        taxes: 200
      },
      flights: [ /* ... */ ],
      hotels: [ /* ... */ ],
      travelers: [ /* ... */ ],
      paymentMethod: { /* ... */ }
    },
    requiresApproval: true,
    approvalChain: [
      { role: "MANAGER", name: "John Smith" },
      { role: "FINANCE", name: "Jane Doe" }
    ],
    confirmationUrl: "/mock/travel/trips/TRIP-001/confirm",
    expiresAt: "2025-12-06T15:23:00Z"
  }
```

---

## Security & Compliance

### File Upload Security

1. **Validation**:
   - Magic number check (not just extension)
   - File size limits (10MB max)
   - Allowed MIME types only
   - Filename sanitization

2. **Storage**:
   - Store outside web root
   - Generate unique IDs (UUID)
   - Separate directories by type
   - Auto-cleanup after TTL

3. **Malware Scanning**:
   - ClamAV integration (production)
   - Quarantine suspicious files
   - Alert on detection

### Data Privacy

1. **PII Protection**:
   - No PII in logs
   - Encrypted storage for sensitive docs
   - Redaction in error messages
   - GDPR compliance

2. **Session Security**:
   - Secure session IDs (UUID v4)
   - Redis encryption at rest
   - 2-hour TTL
   - Auto-cleanup on expiry

3. **API Security**:
   - Rate limiting (100 req/min per user)
   - Request validation (Zod schemas)
   - CORS configuration
   - Helmet security headers

### Authentication (Future)

For live mode (not demo):
- OAuth2 for user authentication
- API keys for MCP servers
- JWT tokens for session management
- Role-based access control (RBAC)

---

## Testing Strategy

### Unit Tests

**Backend**:
- Agent tools (mcp.*, ocr.*, nlp.*)
- Complexity scorer
- Intent classifier
- OCR extraction
- NLP extraction
- Component compiler

**Frontend**:
- Dynamic component loader
- Form renderer
- Validation logic
- SSE client

### Integration Tests

- Full invoice flow (manual entry)
- Full invoice flow (OCR)
- Full travel flow (multi-step)
- MCP server communication
- Session management
- File upload and OCR

### E2E Tests

- User journey: Invoice submission
- User journey: Travel planning
- Chat mode end-to-end
- Wizard mode end-to-end
- Error scenarios
- Timeout handling

### Performance Tests

- Agent response time (< 3s)
- OCR processing time (< 5s)
- Component compilation (< 2s)
- SSE latency (< 100ms)
- Concurrent users (100+)

---

## Future Enhancements

### Phase 6: Additional MCP Servers

- **HR Onboarding**: New employee forms, document collection
- **IT Support**: Ticket submission, asset requests
- **Procurement**: Purchase orders, vendor management
- **Facilities**: Room booking, maintenance requests

### Phase 7: Advanced Features

- **Multi-Language Support**: i18n for forms and agent
- **Voice Input**: Speech-to-text for mobile
- **Offline Mode**: Progressive Web App (PWA)
- **Analytics Dashboard**: Form usage, completion rates
- **A/B Testing**: Different agent prompts, UI variations

### Phase 8: Enterprise Features

- **SSO Integration**: SAML, OIDC
- **Audit Logs**: Complete activity tracking
- **Custom Branding**: White-label support
- **API Gateway**: External integrations
- **Webhooks**: Event notifications

### Phase 9: AI Enhancements

- **Fine-Tuned Models**: Custom models for specific domains
- **Multi-Agent Systems**: Specialized agents per domain
- **Reinforcement Learning**: Learn from user feedback
- **Predictive Forms**: Suggest forms based on context

---

## Appendix

### Glossary

- **MCP**: Model Context Protocol (Anthropic)
- **HF**: Hugging Face
- **OCR**: Optical Character Recognition
- **NLP**: Natural Language Processing
- **SSE**: Server-Sent Events
- **ReAct**: Reasoning + Acting (agent pattern)

### References

- [Anthropic MCP Documentation](https://modelcontextprotocol.io/)
- [LangChain.js Documentation](https://js.langchain.com/)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)

### Contact

For questions or clarifications, contact the development team.

---

**Document Version**: 2.0  
**Last Updated**: December 5, 2025  
**Status**: Ready for Implementation Review
