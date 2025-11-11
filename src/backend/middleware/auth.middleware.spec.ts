import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from './auth.middleware';

jest.mock('jsonwebtoken');

describe('authenticate middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  it('should return 401 if no authorization header', () => {
    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header is required'
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'InvalidFormat token123' };

    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>'
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should authenticate valid token and call next', () => {
    const mockPayload = {
      userId: 'user123',
      email: 'test@example.com',
      iat: 1234567890,
      exp: 1234567890
    };

    mockRequest.headers = { authorization: 'Bearer valid-token' };
    (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'dev-secret-key');
    expect(mockRequest.user).toEqual(mockPayload);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 401 for expired token', () => {
    mockRequest.headers = { authorization: 'Bearer expired-token' };
    const error = new Error('Token expired');
    error.name = 'TokenExpiredError';
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw error;
    });

    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired'
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid token', () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };
    const error = new Error('Invalid token');
    error.name = 'JsonWebTokenError';
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw error;
    });

    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token'
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 500 for other errors', () => {
    mockRequest.headers = { authorization: 'Bearer token' };
    const error = new Error('Unexpected error');
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw error;
    });

    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should use JWT_SECRET from environment if available', () => {
    process.env.JWT_SECRET = 'custom-secret';
    const mockPayload = {
      userId: 'user123',
      email: 'test@example.com',
      iat: 1234567890,
      exp: 1234567890
    };

    mockRequest.headers = { authorization: 'Bearer valid-token' };
    (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

    authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'custom-secret');
    expect(nextFunction).toHaveBeenCalled();

    delete process.env.JWT_SECRET;
  });
});
