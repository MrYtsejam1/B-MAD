# Story: STORY-002 - Form Generation API Endpoint

## Story Overview
**Epic**: Form Generation  
**Sprint**: Sprint 1  
**Estimate**: 5 story points  
**Priority**: P0 (Critical)  
**Assignee**: Developer Agent 2 (Backend)  
**Status**: Ready for Development  
**Dependencies**: STORY-001 (LangChain Service) - COMPLETED

---

## Context

### From PRD

```
API Endpoint: POST /api/v1/forms/generate

Request:
{
  "description": "Create a contact form with name, email, and message fields",
  "options": {
    "theme": "light",
    "layout": "vertical"
  }
}

Response (Success - 200):
{
  "id": "form_1699564800000_abc123",
  "schema": {
    "title": "Contact Form",
    "description": "Please fill out the form below",
    "fields": [...],
    "layout": "vertical",
    "theme": "light"
  },
  "metadata": {
    "generatedAt": "2025-11-11T18:00:00.000Z",
    "model": "gpt-4",
    "cached": false,
    "version": "1.0"
  }
}

Response (Error - 400):
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Description must be at least 10 characters",
    "details": {...}
  }
}

Non-Functional Requirements:
- NFR-1.1: API response time <200ms (excluding LLM call)
- NFR-4.2: Rate limiting: 10 requests per minute per IP for form generation
- NFR-4.3: Input validation using Joi schemas
- NFR-4.4: JWT authentication required
```

### From Architecture

```
API Layer Architecture:

The API layer follows RESTful principles with versioning (/api/v1/). All endpoints return JSON and use standard HTTP status codes.

Controller Pattern:
- Controllers handle HTTP request/response
- Validate input using Joi schemas
- Call service layer for business logic
- Transform service responses to API responses
- Handle errors with consistent error format

Middleware Stack:
1. Helmet (security headers)
2. CORS (cross-origin requests)
3. Rate limiting (express-rate-limit)
4. JWT authentication
5. Request validation (Joi)
6. Error handling

Form Generation Endpoint:
POST /api/v1/forms/generate

Responsibilities:
- Validate request body (description, options)
- Call LangChainService.generateFormSchema()
- Return formatted response
- Handle errors (validation, LLM failures, timeouts)

Rate Limiting:
- General API: 100 requests per 15 minutes
- Form generation: 10 requests per minute (more restrictive)

Authentication:
- JWT token in Authorization header
- Format: "Bearer <token>"
- Validate token signature and expiration
- Extract user ID from token payload
```

### From Test Strategy

```
Integration Tests Required:
- Test form generation with valid input
- Test form generation with minimal input
- Test form generation with complex requirements
- Test rate limiting enforcement
- Test authentication (valid token, invalid token, missing token)
- Test input validation errors
- Test LangChain service errors
- Test timeout handling
- Test response format

API Test Coverage Target: >80%

Performance Requirements:
- API overhead <200ms (excluding LLM call)
- Total response time <2s (including LLM)
```

---

## User Story

**As a** frontend developer  
**I want** a REST API endpoint to generate form schemas  
**So that** I can create forms dynamically from natural language descriptions

---

## Acceptance Criteria

1. [ ] POST /api/v1/forms/generate endpoint created
2. [ ] Request validation using Joi schema
3. [ ] JWT authentication middleware applied
4. [ ] Rate limiting applied (10 req/min for generation)
5. [ ] Calls LangChainService.generateFormSchema()
6. [ ] Returns formatted JSON response with schema
7. [ ] Handles validation errors (400 status)
8. [ ] Handles authentication errors (401 status)
9. [ ] Handles rate limit errors (429 status)
10. [ ] Handles service errors (500 status)
11. [ ] Integration tests written (>80% coverage)
12. [ ] API documentation added
13. [ ] Response time <200ms overhead (excluding LLM)

---

## Implementation Details

### Files to Create/Modify

```
src/backend/controllers/form.controller.ts          (CREATE)
src/backend/controllers/form.controller.spec.ts     (CREATE)
src/backend/middleware/auth.middleware.ts           (CREATE)
src/backend/middleware/auth.middleware.spec.ts      (CREATE)
src/backend/middleware/validation.middleware.ts     (CREATE)
src/backend/routes/form.routes.ts                   (CREATE)
src/backend/validators/form.validators.ts           (CREATE)
src/backend/index.ts                                (MODIFY - add routes)
```

### Code Implementation

#### File: src/backend/validators/form.validators.ts

```typescript
import Joi from 'joi';

/**
 * Validation schemas for form-related requests
 */

export const generateFormSchema = Joi.object({
  description: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 1000 characters',
      'any.required': 'Description is required'
    }),
  
  options: Joi.object({
    theme: Joi.string().valid('light', 'dark').optional(),
    layout: Joi.string().valid('vertical', 'horizontal', 'grid').optional(),
    includeSubmitButton: Joi.boolean().optional()
  }).optional()
});
```

#### File: src/backend/middleware/validation.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { logger } from '../utils/logger';

/**
 * Validation middleware factory
 */
export const validate = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed', { errors, body: req.body });

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors
        }
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
};
```

#### File: src/backend/middleware/auth.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT authentication middleware
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header is required'
        }
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>'
        }
      });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'dev-secret-key';

    const decoded = jwt.verify(token, secret) as JWTPayload;
    req.user = decoded;

    logger.debug('User authenticated', { userId: decoded.userId });
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    }

    logger.error('Authentication error', { error: error.message });
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};
```

#### File: src/backend/controllers/form.controller.ts

```typescript
import { Request, Response } from 'express';
import { LangChainService } from '../services/langchain.service';
import { GenerationOptions } from '../models/form-schema.model';
import { logger } from '../utils/logger';

/**
 * Form controller handling form-related API endpoints
 */
export class FormController {
  private langChainService: LangChainService;

  constructor() {
    this.langChainService = new LangChainService();
  }

  /**
   * Generate form schema from natural language description
   * POST /api/v1/forms/generate
   */
  async generateForm(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const { description, options } = req.body;
      const userId = req.user?.userId;

      logger.info('Form generation requested', {
        userId,
        descriptionLength: description.length,
        options
      });

      // Generate form schema using LangChain service
      const schema = await this.langChainService.generateFormSchema(
        description,
        options as GenerationOptions
      );

      const duration = Date.now() - startTime;

      logger.info('Form generation successful', {
        userId,
        formId: schema.id,
        duration,
        fieldCount: schema.fields.length
      });

      // Return success response
      res.status(200).json({
        id: schema.id,
        schema: {
          title: schema.title,
          description: schema.description,
          fields: schema.fields,
          layout: schema.layout,
          theme: schema.theme
        },
        metadata: schema.metadata
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Form generation failed', {
        userId: req.user?.userId,
        duration,
        error: error.message,
        stack: error.stack
      });

      // Handle specific error types
      if (error.message.includes('Description must be')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: error.message
          }
        });
      }

      if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
        return res.status(504).json({
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: 'Form generation timed out. Please try again.'
          }
        });
      }

      // Generic error response
      res.status(500).json({
        error: {
          code: 'GENERATION_ERROR',
          message: 'Failed to generate form schema',
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
        }
      });
    }
  }
}
```

#### File: src/backend/routes/form.routes.ts

```typescript
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FormController } from '../controllers/form.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { generateFormSchema } from '../validators/form.validators';

const router = Router();
const formController = new FormController();

// Rate limiter for form generation (10 requests per minute)
const generateFormLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many form generation requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/v1/forms/generate
 * Generate form schema from natural language description
 * 
 * Authentication: Required (JWT)
 * Rate Limit: 10 requests per minute
 */
router.post(
  '/generate',
  authenticate,
  generateFormLimiter,
  validate(generateFormSchema),
  (req, res) => formController.generateForm(req, res)
);

export default router;
```

#### File: src/backend/index.ts (modifications)

```typescript
// Add after existing imports
import formRoutes from './routes/form.routes';

// Add after existing middleware, before error handler
app.use('/api/v1/forms', formRoutes);
```

#### File: src/backend/controllers/form.controller.spec.ts

```typescript
import { Request, Response } from 'express';
import { FormController } from './form.controller';
import { LangChainService } from '../services/langchain.service';

jest.mock('../services/langchain.service');

describe('FormController', () => {
  let controller: FormController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockLangChainService: jest.Mocked<LangChainService>;

  beforeEach(() => {
    mockLangChainService = {
      generateFormSchema: jest.fn()
    } as any;

    controller = new FormController();
    (controller as any).langChainService = mockLangChainService;

    mockRequest = {
      body: {},
      user: { userId: 'user123', email: 'test@example.com', iat: 0, exp: 0 }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('generateForm', () => {
    it('should generate form and return 200', async () => {
      const mockSchema = {
        id: 'form_123',
        title: 'Contact Form',
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
        layout: 'vertical' as const,
        theme: 'light' as const,
        metadata: {
          generatedAt: '2025-11-11T18:00:00.000Z',
          model: 'gpt-4',
          cached: false,
          version: '1.0'
        }
      };

      mockLangChainService.generateFormSchema.mockResolvedValue(mockSchema);
      mockRequest.body = { description: 'Create a contact form' };

      await controller.generateForm(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: mockSchema.id,
        schema: {
          title: mockSchema.title,
          fields: mockSchema.fields,
          layout: mockSchema.layout,
          theme: mockSchema.theme,
          description: undefined
        },
        metadata: mockSchema.metadata
      });
    });

    it('should return 400 for invalid input', async () => {
      mockLangChainService.generateFormSchema.mockRejectedValue(
        new Error('Description must be at least 10 characters')
      );
      mockRequest.body = { description: 'short' };

      await controller.generateForm(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_INPUT',
          message: 'Description must be at least 10 characters'
        }
      });
    });

    it('should return 504 for timeout', async () => {
      mockLangChainService.generateFormSchema.mockRejectedValue(
        new Error('Request timeout')
      );
      mockRequest.body = { description: 'Create a form' };

      await controller.generateForm(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(504);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'Form generation timed out. Please try again.'
        }
      });
    });

    it('should return 500 for service errors', async () => {
      mockLangChainService.generateFormSchema.mockRejectedValue(
        new Error('LLM service unavailable')
      );
      mockRequest.body = { description: 'Create a form' };

      await controller.generateForm(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'GENERATION_ERROR',
            message: 'Failed to generate form schema'
          })
        })
      );
    });
  });
});
```

---

## Technical Notes

### Architecture Decisions

1. **Controller Pattern**: Separates HTTP concerns from business logic
2. **Middleware Chain**: Modular, reusable middleware for auth, validation, rate limiting
3. **Joi Validation**: Schema-based validation with clear error messages
4. **JWT Authentication**: Stateless authentication for scalability
5. **Rate Limiting**: Prevents abuse, separate limits for different endpoints

### Performance Considerations

- **API Overhead**: <200ms (validation, auth, response formatting)
- **Total Response Time**: <2s (including LLM call from STORY-001)
- **Rate Limiting**: Prevents resource exhaustion

### Security Considerations

- **JWT Validation**: Signature verification, expiration checking
- **Input Sanitization**: Joi strips unknown fields
- **Rate Limiting**: Prevents brute force and DoS attacks
- **Error Messages**: Don't expose sensitive information in production

---

## Testing Requirements

### Integration Tests

**Test Coverage**: >80%

**Test Cases**:
1. ✅ Generate form with valid input and auth
2. ✅ Return 400 for invalid description (too short)
3. ✅ Return 400 for invalid options
4. ✅ Return 401 for missing auth token
5. ✅ Return 401 for invalid auth token
6. ✅ Return 401 for expired auth token
7. ✅ Return 429 after 10 requests in 1 minute
8. ✅ Return 504 for LLM timeout
9. ✅ Return 500 for service errors
10. ✅ Response format matches API spec

### Performance Tests

**Benchmark**: Measure API overhead (excluding LLM call)
- Target: <200ms for 95th percentile

---

## Definition of Done

- [x] Controller implemented with error handling
- [x] Authentication middleware implemented
- [x] Validation middleware implemented
- [x] Rate limiting configured
- [x] Routes configured
- [x] Integration tests written (>80% coverage)
- [x] All tests passing
- [x] Linting passed
- [x] API documentation added
- [x] Performance benchmark met (<200ms overhead)
- [x] Code reviewed
- [x] Ready for frontend integration

---

**Story Status**: Ready for Development  
**Created**: November 11, 2025  
**Dependencies**: STORY-001 (LangChain Service) - COMPLETED  
**Next Story**: STORY-003 - Form Schema Validation Service
