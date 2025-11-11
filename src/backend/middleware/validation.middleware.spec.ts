import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validate } from './validation.middleware';

describe('validate middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  it('should validate valid data and call next', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().required()
    });

    mockRequest.body = { name: 'John', age: 30 };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
  });

  it('should return 400 for invalid data', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().required()
    });

    mockRequest.body = { name: 'John' }; // Missing age

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            message: expect.any(String)
          })
        ])
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should strip unknown fields', () => {
    const schema = Joi.object({
      name: Joi.string().required()
    });

    mockRequest.body = { name: 'John', extraField: 'should be removed' };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.body).toEqual({ name: 'John' });
    expect(mockRequest.body).not.toHaveProperty('extraField');
  });

  it('should return all validation errors', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().min(18).required(),
      email: Joi.string().email().required()
    });

    mockRequest.body = { name: '', age: 15, email: 'invalid' };

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'age' }),
          expect.objectContaining({ field: 'email' })
        ])
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle nested field validation', () => {
    const schema = Joi.object({
      user: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required()
      }).required()
    });

    mockRequest.body = { user: { name: 'John' } }; // Missing email

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'user.email',
            message: expect.any(String)
          })
        ])
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should validate optional fields correctly', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      nickname: Joi.string().optional()
    });

    mockRequest.body = { name: 'John' }; // nickname is optional

    const middleware = validate(schema);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});
