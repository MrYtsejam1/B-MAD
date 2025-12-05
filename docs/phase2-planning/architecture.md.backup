# Architecture Document
## Generative UI Adaptive Form System

**Date**: November 11, 2025  
**Version**: 1.0  
**Phase**: 2 - Planning  
**Status**: Draft  
**Owner**: Architect Agent  
**Reviewers**: BMad Master, Product Manager, Developer Agents

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 11, 2025 | Architect Agent | Initial architecture design |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [System Architecture](#system-architecture)
5. [Component Architecture](#component-architecture)
6. [Data Architecture](#data-architecture)
7. [API Design](#api-design)
8. [Security Architecture](#security-architecture)
9. [Performance Architecture](#performance-architecture)
10. [Deployment Architecture](#deployment-architecture)
11. [Technology Stack](#technology-stack)
12. [Integration Patterns](#integration-patterns)
13. [Error Handling Strategy](#error-handling-strategy)
14. [Monitoring and Observability](#monitoring-and-observability)
15. [Scalability Strategy](#scalability-strategy)
16. [Architecture Decisions](#architecture-decisions)

---

## Executive Summary

This document defines the technical architecture for the Generative UI Adaptive Form System. The system uses a modern, layered architecture with clear separation of concerns:

- **Frontend**: Angular web components for dynamic form rendering
- **Backend**: Node.js + Express API with LangChain integration
- **AI Layer**: LangChain.js with OpenAI/Anthropic for form generation
- **Data Layer**: PostgreSQL for persistence, Redis for caching
- **Infrastructure**: Docker containers, cloud-native deployment

**Key Architecture Characteristics**:
- **Scalable**: Horizontal scaling support
- **Resilient**: Graceful degradation and fault tolerance
- **Secure**: Defense in depth, OWASP compliance
- **Performant**: <2s form generation, <200ms API response
- **Maintainable**: Clean architecture, high test coverage

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Angular Web Components (Frontend)            │   │
│  │  - AdaptiveFormComponent                             │   │
│  │  - DynamicFieldComponent                             │   │
│  │  - ValidationService                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express.js API Server                               │   │
│  │  - Rate Limiting                                     │   │
│  │  - Authentication (JWT)                              │   │
│  │  - Request Validation                                │   │
│  │  - CORS, Helmet, Security Middleware                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Form Controller │  │ Submission Ctrl  │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Form Service    │  │ Validation Svc   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI/LangChain Layer                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  LangChain Service                                   │   │
│  │  - Form Generation Chain                             │   │
│  │  - Structured Output Parser (Zod)                    │   │
│  │  - Prompt Templates                                  │   │
│  │  - LLM Integration (OpenAI/Anthropic)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   PostgreSQL     │  │      Redis       │                │
│  │  (Persistence)   │  │    (Caching)     │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### System Context

The system operates in the following context:

**External Systems**:
- **LLM Providers**: OpenAI GPT-4, Anthropic Claude
- **Client Applications**: Web applications integrating the form system
- **Monitoring**: Application monitoring and logging services

**Users**:
- **Developers**: Integrate forms into applications via API
- **End Users**: Fill out generated forms
- **Administrators**: Monitor system health and performance

---

## Architecture Principles

### 1. Separation of Concerns

Each layer has a single, well-defined responsibility:
- **Presentation Layer**: UI rendering and user interaction
- **API Layer**: Request handling and routing
- **Business Logic Layer**: Core application logic
- **Data Layer**: Data persistence and retrieval

### 2. API-First Design

- All functionality exposed via REST APIs
- APIs versioned (v1, v2, etc.)
- OpenAPI/Swagger documentation
- Contract-first development

### 3. Stateless Services

- No server-side session state
- JWT for authentication
- Enables horizontal scaling
- Cache for performance, not state

### 4. Defense in Depth

- Multiple layers of security
- Input validation at every layer
- Sanitization of all outputs
- Principle of least privilege

### 5. Fail Fast, Fail Safe

- Early validation and error detection
- Graceful degradation
- Circuit breakers for external services
- Comprehensive error handling

### 6. Performance by Design

- Caching at multiple levels
- Async operations where possible
- Database query optimization
- CDN for static assets

### 7. Observability

- Structured logging
- Metrics collection
- Distributed tracing
- Health checks

### 8. Testability

- Dependency injection
- Interface-based design
- Mocking support
- High test coverage (>80%)

---

## System Architecture

### Layered Architecture

The system follows a 4-tier layered architecture:

#### Layer 1: Presentation Layer (Frontend)

**Technology**: Angular 17+ Web Components

**Responsibilities**:
- Render forms from schemas
- Handle user interactions
- Client-side validation
- State management
- API communication

**Components**:
- `AdaptiveFormComponent`: Main form container
- `DynamicFieldComponent`: Dynamic field renderer
- `FieldTypeComponents`: Text, Select, Checkbox, etc.
- `ValidationService`: Client-side validation logic
- `FormStateService`: Form state management

**Communication**:
- REST API calls to backend
- WebSocket for real-time updates (future)

---

#### Layer 2: API Layer (Backend)

**Technology**: Node.js + Express.js

**Responsibilities**:
- Request routing
- Authentication/authorization
- Rate limiting
- Input validation
- Response formatting
- Error handling

**Components**:
- `Express Server`: HTTP server
- `Middleware Stack`: Auth, CORS, Helmet, Rate Limiting
- `Route Handlers`: API endpoints
- `Request Validators`: Input validation
- `Error Handlers`: Centralized error handling

**Endpoints**:
- `POST /api/v1/forms/generate`: Generate form
- `GET /api/v1/forms/:id`: Get form schema
- `POST /api/v1/forms/:id/submit`: Submit form
- `POST /api/v1/forms/:id/validate`: Validate form data
- `GET /health`: Health check

---

#### Layer 3: Business Logic Layer

**Technology**: TypeScript Services

**Responsibilities**:
- Core business logic
- Form generation orchestration
- Validation logic
- Data transformation
- Business rules enforcement

**Services**:

**FormGenerationService**:
```typescript
class FormGenerationService {
  async generateForm(description: string, options?: GenerationOptions): Promise<FormSchema>
  async validateSchema(schema: FormSchema): Promise<ValidationResult>
  async cacheSchema(schema: FormSchema): Promise<void>
  async getSchema(id: string): Promise<FormSchema | null>
}
```

**LangChainService**:
```typescript
class LangChainService {
  async generateFormSchema(prompt: string): Promise<FormSchema>
  async parseStructuredOutput(output: string): Promise<FormSchema>
  async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T>
}
```

**ValidationService**:
```typescript
class ValidationService {
  validateField(field: FormField, value: any): ValidationResult
  validateForm(schema: FormSchema, data: Record<string, any>): ValidationResult
  async validateAsync(field: FormField, value: any): Promise<ValidationResult>
}
```

**SubmissionService**:
```typescript
class SubmissionService {
  async submitForm(formId: string, data: Record<string, any>): Promise<Submission>
  async validateSubmission(formId: string, data: Record<string, any>): Promise<ValidationResult>
  async storeSubmission(submission: Submission): Promise<void>
}
```

---

#### Layer 4: Data Layer

**Technology**: PostgreSQL + Redis

**Responsibilities**:
- Data persistence
- Caching
- Query optimization
- Data integrity

**Components**:

**PostgreSQL Database**:
- Forms table
- Submissions table
- Users table (future)
- Audit logs table

**Redis Cache**:
- Generated form schemas (TTL: 1 hour)
- API rate limiting counters
- Session data (future)

---

## Component Architecture

### Frontend Components

#### 1. AdaptiveFormComponent

**Purpose**: Main form container that orchestrates form rendering

**Inputs**:
- `schema: FormSchema` - Form schema to render
- `initialData?: Record<string, any>` - Initial form data
- `onSubmit: (data: Record<string, any>) => void` - Submit callback

**Outputs**:
- `formSubmit: EventEmitter<FormData>` - Form submission event
- `formChange: EventEmitter<FormData>` - Form change event
- `formError: EventEmitter<ValidationError[]>` - Validation errors

**Responsibilities**:
- Render form from schema
- Manage form state
- Handle form submission
- Coordinate validation
- Apply conditional logic

**Template**:
```html
<form [formGroup]="formGroup" (ngSubmit)="onSubmit()">
  <h2>{{ schema.title }}</h2>
  <p *ngIf="schema.description">{{ schema.description }}</p>
  
  <div *ngFor="let field of visibleFields" class="form-field">
    <app-dynamic-field 
      [field]="field" 
      [formGroup]="formGroup"
      (fieldChange)="onFieldChange($event)">
    </app-dynamic-field>
  </div>
  
  <div class="form-actions">
    <button type="submit" [disabled]="!formGroup.valid || submitting">
      {{ submitting ? 'Submitting...' : 'Submit' }}
    </button>
  </div>
  
  <div *ngIf="errorMessage" class="error-message">
    {{ errorMessage }}
  </div>
</form>
```

---

#### 2. DynamicFieldComponent

**Purpose**: Dynamically render form fields based on type

**Inputs**:
- `field: FormField` - Field configuration
- `formGroup: FormGroup` - Parent form group

**Outputs**:
- `fieldChange: EventEmitter<FieldChangeEvent>` - Field value change

**Responsibilities**:
- Render appropriate field type
- Apply validation
- Show error messages
- Handle field interactions

**Component Selection**:
```typescript
getFieldComponent(type: FieldType): Type<any> {
  const componentMap = {
    'text': TextFieldComponent,
    'email': EmailFieldComponent,
    'textarea': TextareaFieldComponent,
    'select': SelectFieldComponent,
    'checkbox': CheckboxFieldComponent,
    'radio': RadioFieldComponent,
    'date': DateFieldComponent,
    'file': FileFieldComponent
  };
  return componentMap[type];
}
```

---

### Backend Services

#### 1. FormGenerationService

**File**: `src/backend/services/form-generation.service.ts`

**Implementation**:
```typescript
import { LangChainService } from './langchain.service';
import { CacheService } from './cache.service';
import { FormSchema, GenerationOptions } from '../models/form-schema.model';

export class FormGenerationService {
  constructor(
    private langChainService: LangChainService,
    private cacheService: CacheService
  ) {}

  async generateForm(
    description: string, 
    options?: GenerationOptions
  ): Promise<FormSchema> {
    // Check cache first
    const cacheKey = this.getCacheKey(description, options);
    const cached = await this.cacheService.get<FormSchema>(cacheKey);
    
    if (cached) {
      return { ...cached, metadata: { ...cached.metadata, cached: true } };
    }

    // Generate with LangChain
    const schema = await this.langChainService.generateFormSchema(
      description, 
      options
    );

    // Validate schema
    await this.validateSchema(schema);

    // Cache result
    await this.cacheService.set(cacheKey, schema, 3600); // 1 hour TTL

    return schema;
  }

  async validateSchema(schema: FormSchema): Promise<void> {
    // Validate schema structure
    if (!schema.fields || schema.fields.length === 0) {
      throw new Error('Schema must have at least one field');
    }

    // Validate each field
    for (const field of schema.fields) {
      this.validateField(field);
    }
  }

  private validateField(field: FormField): void {
    if (!field.name || !field.type || !field.label) {
      throw new Error('Field must have name, type, and label');
    }

    const validTypes = ['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file'];
    if (!validTypes.includes(field.type)) {
      throw new Error(`Invalid field type: ${field.type}`);
    }
  }

  private getCacheKey(description: string, options?: GenerationOptions): string {
    return `form:${Buffer.from(description).toString('base64')}:${JSON.stringify(options || {})}`;
  }
}
```

---

#### 2. LangChainService

**File**: `src/backend/services/langchain.service.ts`

**Implementation**:
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from 'langchain/prompts';
import { z } from 'zod';
import { FormSchema } from '../models/form-schema.model';

export class LangChainService {
  private llm: ChatOpenAI | ChatAnthropic;
  private parser: StructuredOutputParser<FormSchema>;

  constructor() {
    // Initialize LLM (OpenAI or Anthropic based on config)
    this.llm = new ChatOpenAI({
      modelName: process.env.LANGCHAIN_MODEL || 'gpt-4',
      temperature: parseFloat(process.env.LANGCHAIN_TEMPERATURE || '0.3'),
      maxTokens: parseInt(process.env.LANGCHAIN_MAX_TOKENS || '2000'),
      timeout: 30000 // 30 second timeout
    });

    // Define Zod schema for structured output
    const formSchemaZod = z.object({
      title: z.string(),
      description: z.string().optional(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.enum(['text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'date', 'file']),
        label: z.string(),
        placeholder: z.string().optional(),
        helpText: z.string().optional(),
        required: z.boolean(),
        defaultValue: z.any().optional(),
        validation: z.object({
          minLength: z.number().optional(),
          maxLength: z.number().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional()
        }).optional(),
        options: z.array(z.object({
          value: z.union([z.string(), z.number()]),
          label: z.string()
        })).optional(),
        conditionalDisplay: z.object({
          field: z.string(),
          operator: z.enum(['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan']),
          value: z.any(),
          action: z.enum(['show', 'hide'])
        }).optional()
      })),
      layout: z.enum(['vertical', 'horizontal', 'grid']),
      theme: z.enum(['light', 'dark'])
    });

    this.parser = StructuredOutputParser.fromZodSchema(formSchemaZod);
  }

  async generateFormSchema(
    description: string,
    options?: GenerationOptions
  ): Promise<FormSchema> {
    const formatInstructions = this.parser.getFormatInstructions();

    const prompt = PromptTemplate.fromTemplate(`
You are an expert form designer. Generate a form schema based on the user's description.

User Description: {description}

Options: {options}

Requirements:
1. Create appropriate field types for the described form
2. Add helpful labels and placeholders
3. Include validation rules where appropriate
4. Make required fields explicit
5. Add help text for complex fields
6. Use conditional logic if fields depend on each other
7. Ensure accessibility (clear labels, help text)

{format_instructions}

Generate a complete, valid form schema:
    `);

    const input = await prompt.format({
      description,
      options: JSON.stringify(options || {}),
      format_instructions: formatInstructions
    });

    // Call LLM with retry logic
    const response = await this.retryWithBackoff(async () => {
      return await this.llm.call([{ role: 'user', content: input }]);
    });

    // Parse structured output
    const schema = await this.parser.parse(response.content as string);

    // Add metadata
    return {
      ...schema,
      id: this.generateId(),
      metadata: {
        generatedAt: new Date().toISOString(),
        model: process.env.LANGCHAIN_MODEL || 'gpt-4',
        cached: false,
        version: '1.0'
      }
    };
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private generateId(): string {
    return `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## Data Architecture

### Database Schema (PostgreSQL)

#### Table: forms

```sql
CREATE TABLE forms (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  metadata JSONB,
  INDEX idx_created_at (created_at),
  INDEX idx_created_by (created_by)
);
```

#### Table: submissions

```sql
CREATE TABLE submissions (
  id VARCHAR(255) PRIMARY KEY,
  form_id VARCHAR(255) NOT NULL REFERENCES forms(id),
  data JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address VARCHAR(45),
  metadata JSONB,
  INDEX idx_form_id (form_id),
  INDEX idx_submitted_at (submitted_at),
  INDEX idx_status (status)
);
```

#### Table: audit_logs

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  changes JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_timestamp (timestamp)
);
```

---

### Cache Schema (Redis)

**Key Patterns**:

```
form:{hash}:{options_hash}     # Cached form schemas
  TTL: 3600 seconds (1 hour)
  Value: JSON string of FormSchema

rate_limit:{user_id}:{endpoint} # Rate limiting counters
  TTL: 900 seconds (15 minutes)
  Value: Request count

session:{session_id}            # User sessions (future)
  TTL: 3600 seconds (1 hour)
  Value: Session data
```

**Example**:
```
SET form:YWRhcHRpdmUgZm9ybQ==:e30= '{"id":"form_123","title":"Contact Form",...}'
EXPIRE form:YWRhcHRpdmUgZm9ybQ==:e30= 3600

INCR rate_limit:user_123:/api/v1/forms/generate
EXPIRE rate_limit:user_123:/api/v1/forms/generate 900
```

---

## API Design

### REST API Principles

1. **Resource-Based URLs**: `/api/v1/forms`, `/api/v1/submissions`
2. **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (delete)
3. **Status Codes**: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)
4. **JSON Format**: All requests and responses in JSON
5. **Versioning**: `/api/v1/` prefix for version 1
6. **Pagination**: `?page=1&limit=20` for list endpoints
7. **Filtering**: `?status=success&from=2025-01-01` for filtering
8. **Sorting**: `?sort=created_at&order=desc` for sorting

---

### API Endpoints

#### POST /api/v1/forms/generate

**Description**: Generate a form schema from natural language

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "description": "Create a contact form with name, email, and message",
  "options": {
    "theme": "light",
    "layout": "vertical"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "form_abc123",
  "schema": { /* FormSchema */ },
  "metadata": {
    "generatedAt": "2025-11-11T17:30:00Z",
    "model": "gpt-4",
    "cached": false
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid description or options
- `401 Unauthorized`: Missing or invalid JWT token
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Generation failed

---

#### GET /api/v1/forms/:formId

**Description**: Retrieve a form schema by ID

**Request Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "id": "form_abc123",
  "schema": { /* FormSchema */ },
  "metadata": { /* metadata */ }
}
```

**Error Responses**:
- `404 Not Found`: Form not found
- `401 Unauthorized`: Missing or invalid JWT token

---

#### POST /api/v1/forms/:formId/submit

**Description**: Submit form data

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello!"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "submission_xyz789",
  "formId": "form_abc123",
  "status": "success",
  "submittedAt": "2025-11-11T17:35:00Z"
}
```

**Error Responses**:
- `422 Unprocessable Entity`: Validation failed
- `404 Not Found`: Form not found
- `401 Unauthorized`: Missing or invalid JWT token

---

## Security Architecture

### Authentication & Authorization

**JWT-Based Authentication**:
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number; // Issued at
  exp: number; // Expiration
}

// Token generation
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Token verification middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

### Input Validation & Sanitization

**Request Validation**:
```typescript
import Joi from 'joi';

const generateFormSchema = Joi.object({
  description: Joi.string().min(10).max(1000).required(),
  options: Joi.object({
    theme: Joi.string().valid('light', 'dark'),
    layout: Joi.string().valid('vertical', 'horizontal', 'grid')
  }).optional()
});

// Validation middleware
const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  next();
};
```

**Output Sanitization**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeFormSchema(schema: FormSchema): FormSchema {
  return {
    ...schema,
    title: DOMPurify.sanitize(schema.title),
    description: schema.description ? DOMPurify.sanitize(schema.description) : undefined,
    fields: schema.fields.map(field => ({
      ...field,
      label: DOMPurify.sanitize(field.label),
      placeholder: field.placeholder ? DOMPurify.sanitize(field.placeholder) : undefined,
      helpText: field.helpText ? DOMPurify.sanitize(field.helpText) : undefined
    }))
  };
}
```

---

### Rate Limiting

**Implementation**:
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'redis';

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Form generation rate limit (more restrictive)
const generationLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:generation:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 generations per minute
  message: 'Too many form generation requests'
});

app.use('/api/', apiLimiter);
app.use('/api/v1/forms/generate', generationLimiter);
```

---

### Security Headers

**Helmet.js Configuration**:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.API_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

## Performance Architecture

### Caching Strategy

**Multi-Level Caching**:

1. **Browser Cache**: Static assets (CSS, JS, images)
   - Cache-Control headers
   - ETags for validation
   - Service Worker (future)

2. **CDN Cache**: Static content delivery
   - CloudFront or similar
   - Edge caching
   - Geo-distribution

3. **Application Cache (Redis)**: Dynamic content
   - Form schemas (1 hour TTL)
   - API responses (configurable TTL)
   - Rate limiting counters

4. **Database Query Cache**: PostgreSQL query results
   - Prepared statements
   - Query result caching
   - Connection pooling

**Cache Invalidation**:
```typescript
class CacheService {
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateForm(formId: string): Promise<void> {
    await this.invalidate(`form:*:${formId}:*`);
  }
}
```

---

### Database Optimization

**Connection Pooling**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

**Query Optimization**:
- Use indexes on frequently queried columns
- Avoid N+1 queries
- Use EXPLAIN ANALYZE for slow queries
- Implement pagination for large result sets
- Use prepared statements

**Example Optimized Query**:
```sql
-- Get recent submissions with form details
SELECT 
  s.id, s.data, s.submitted_at,
  f.title, f.schema
FROM submissions s
INNER JOIN forms f ON s.form_id = f.id
WHERE s.submitted_at > NOW() - INTERVAL '7 days'
ORDER BY s.submitted_at DESC
LIMIT 100;

-- Index for optimization
CREATE INDEX idx_submissions_recent ON submissions(submitted_at DESC);
```

---

### Async Operations

**Background Jobs** (future):
```typescript
import Bull from 'bull';

const formGenerationQueue = new Bull('form-generation', {
  redis: process.env.REDIS_URL
});

// Add job to queue
await formGenerationQueue.add({
  description: 'Create contact form',
  userId: 'user_123'
});

// Process jobs
formGenerationQueue.process(async (job) => {
  const { description, userId } = job.data;
  const schema = await formGenerationService.generateForm(description);
  // Notify user via WebSocket or email
});
```

---

## Deployment Architecture

### Container Architecture

**Docker Compose** (Development):
```yaml
version: '3.8'

services:
  frontend:
    build: ./src/frontend
    ports:
      - "4200:4200"
    volumes:
      - ./src/frontend:/app
    environment:
      - API_URL=http://backend:3000

  backend:
    build: ./src/backend
    ports:
      - "3000:3000"
    volumes:
      - ./src/backend:/app
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/bmad
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=bmad
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

### Cloud Deployment (Production)

**AWS Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              CloudFront (CDN) + WAF                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Application Load Balancer (ALB)                 │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│   ECS Fargate        │    │   ECS Fargate        │
│   (Backend API)      │    │   (Backend API)      │
│   Auto-scaling       │    │   Auto-scaling       │
└──────────────────────┘    └──────────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
              ┌─────────────────────────┐
              │   RDS PostgreSQL        │
              │   Multi-AZ              │
              │   Read Replicas         │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   ElastiCache Redis     │
              │   Cluster Mode          │
              └─────────────────────────┘
```

**Infrastructure as Code** (Terraform):
```hcl
resource "aws_ecs_cluster" "bmad" {
  name = "bmad-cluster"
}

resource "aws_ecs_service" "backend" {
  name            = "bmad-backend"
  cluster         = aws_ecs_cluster.bmad.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  network_configuration {
    subnets         = aws_subnet.private.*.id
    security_groups = [aws_security_group.backend.id]
  }
}
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 17+ | Web framework |
| TypeScript | 5.3+ | Type safety |
| RxJS | 7+ | Reactive programming |
| Angular Material | 17+ | UI components (optional) |
| Jest | 29+ | Unit testing |
| Cypress | 13+ | E2E testing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ LTS | Runtime |
| Express | 4.18+ | Web framework |
| TypeScript | 5.3+ | Type safety |
| LangChain.js | 0.1+ | LLM integration |
| Zod | 3.22+ | Schema validation |
| Jest | 29+ | Unit testing |
| Supertest | 6+ | API testing |

### Data Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 16+ | Primary database |
| Redis | 7+ | Caching |
| pg | 8.11+ | PostgreSQL client |
| ioredis | 5+ | Redis client |

### DevOps

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24+ | Containerization |
| Docker Compose | 2+ | Local orchestration |
| GitHub Actions | - | CI/CD |
| Terraform | 1.6+ | Infrastructure as Code |
| AWS | - | Cloud provider |

---

## Integration Patterns

### LangChain Integration

**Pattern**: Adapter Pattern

```typescript
interface LLMProvider {
  generateFormSchema(prompt: string): Promise<FormSchema>;
}

class OpenAIProvider implements LLMProvider {
  async generateFormSchema(prompt: string): Promise<FormSchema> {
    // OpenAI-specific implementation
  }
}

class AnthropicProvider implements LLMProvider {
  async generateFormSchema(prompt: string): Promise<FormSchema> {
    // Anthropic-specific implementation
  }
}

class LangChainService {
  constructor(private provider: LLMProvider) {}
  
  async generateFormSchema(description: string): Promise<FormSchema> {
    return this.provider.generateFormSchema(description);
  }
}
```

---

### Error Handling Strategy

**Centralized Error Handler**:
```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});
```

---

## Monitoring and Observability

### Logging

**Structured Logging with Winston**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage
logger.info('Form generated', {
  formId: 'form_123',
  userId: 'user_456',
  duration: 1234
});
```

---

### Metrics

**Key Metrics to Track**:
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (errors/total requests)
- Form generation time
- Cache hit rate
- Database query time
- LangChain API latency

---

### Health Checks

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      langchain: await checkLangChain()
    }
  };

  const allHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  
  res.status(allHealthy ? 200 : 503).json(health);
});
```

---

## Scalability Strategy

### Horizontal Scaling

- **Stateless Services**: No server-side session state
- **Load Balancing**: Distribute traffic across instances
- **Auto-scaling**: Scale based on CPU/memory/request metrics
- **Database Read Replicas**: Distribute read load

### Vertical Scaling

- **Resource Optimization**: Efficient algorithms and data structures
- **Connection Pooling**: Reuse database connections
- **Caching**: Reduce database and LLM API calls

---

## Architecture Decisions

### ADR-001: Use PostgreSQL for Primary Database

**Status**: Accepted

**Context**: Need a reliable, ACID-compliant database for storing forms and submissions.

**Decision**: Use PostgreSQL 16+ as the primary database.

**Rationale**:
- JSONB support for flexible schema storage
- Strong ACID guarantees
- Excellent performance
- Mature ecosystem
- Good TypeScript support

**Consequences**:
- Need to manage database migrations
- Requires connection pooling for performance
- May need read replicas for scale

---

### ADR-002: Use Redis for Caching

**Status**: Accepted

**Context**: Need fast caching for form schemas and rate limiting.

**Decision**: Use Redis 7+ for caching layer.

**Rationale**:
- Extremely fast (in-memory)
- TTL support built-in
- Excellent for rate limiting
- Simple key-value model
- Good TypeScript support

**Consequences**:
- Additional infrastructure to manage
- Cache invalidation complexity
- Need backup strategy

---

### ADR-003: Use LangChain for LLM Integration

**Status**: Accepted

**Context**: Need to integrate with LLMs for form generation.

**Decision**: Use LangChain.js as the LLM integration framework.

**Rationale**:
- Abstracts LLM provider differences
- Structured output parsing with Zod
- Prompt template management
- Retry and error handling built-in
- Active development and community

**Consequences**:
- Dependency on LangChain updates
- Learning curve for team
- May need custom extensions

---

## Appendix

### A. Glossary

- **LangChain**: Framework for building LLM-powered applications
- **Zod**: TypeScript-first schema validation library
- **JWT**: JSON Web Token for authentication
- **CORS**: Cross-Origin Resource Sharing
- **CSP**: Content Security Policy
- **TTL**: Time To Live (cache expiration)
- **ACID**: Atomicity, Consistency, Isolation, Durability

### B. References

- LangChain Documentation: https://js.langchain.com/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Redis Documentation: https://redis.io/docs/
- Express.js Documentation: https://expressjs.com/
- Angular Documentation: https://angular.io/docs

---

**Document Status**: Draft - Pending Review  
**Next Review**: Phase 2 Gate Review  
**Approval Required**: BMad Master, Product Manager, Developer Agents

**Last Updated**: November 11, 2025 17:41:00 UTC
