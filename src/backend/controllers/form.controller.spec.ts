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
        fields: [{ name: 'email', type: 'email' as const, label: 'Email', required: true }],
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

    it('should include options in generation', async () => {
      const mockSchema = {
        id: 'form_123',
        title: 'Test Form',
        fields: [],
        layout: 'horizontal' as const,
        theme: 'dark' as const,
        metadata: {
          generatedAt: '2025-11-11T18:00:00.000Z',
          model: 'gpt-4',
          cached: false,
          version: '1.0'
        }
      };

      mockLangChainService.generateFormSchema.mockResolvedValue(mockSchema);
      mockRequest.body = {
        description: 'Create a form',
        options: { theme: 'dark', layout: 'horizontal' }
      };

      await controller.generateForm(mockRequest as Request, mockResponse as Response);

      expect(mockLangChainService.generateFormSchema).toHaveBeenCalledWith(
        'Create a form',
        { theme: 'dark', layout: 'horizontal' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should log user ID in requests', async () => {
      const mockSchema = {
        id: 'form_123',
        title: 'Test Form',
        fields: [],
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
      mockRequest.body = { description: 'Create a test form' };
      mockRequest.user = { userId: 'user456', email: 'user@test.com', iat: 0, exp: 0 };

      await controller.generateForm(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
