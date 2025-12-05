import { Injectable, ErrorHandler } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface ErrorContext {
  component?: string;
  action?: string;
  timestamp: string;
  userMessage: string;
  technicalMessage: string;
  retryable: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private errorLog: ErrorContext[] = [];
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  handleError(error: Error | HttpErrorResponse): void {
    const errorContext = this.createErrorContext(error);
    this.logError(errorContext);
    this.displayError(errorContext);
  }

  private createErrorContext(error: Error | HttpErrorResponse): ErrorContext {
    const timestamp = new Date().toISOString();

    if (error instanceof HttpErrorResponse) {
      return this.handleHttpError(error, timestamp);
    } else {
      return this.handleClientError(error, timestamp);
    }
  }

  private handleHttpError(error: HttpErrorResponse, timestamp: string): ErrorContext {
    let userMessage = 'An error occurred. Please try again.';
    let retryable = true;

    switch (error.status) {
      case 0:
        userMessage = 'Unable to connect to the server. Please check your internet connection.';
        retryable = true;
        break;
      case 400:
        userMessage = 'Invalid request. Please check your input and try again.';
        retryable = false;
        break;
      case 401:
        userMessage = 'You are not authorized. Please log in again.';
        retryable = false;
        break;
      case 403:
        userMessage = 'You do not have permission to perform this action.';
        retryable = false;
        break;
      case 404:
        userMessage = 'The requested resource was not found.';
        retryable = false;
        break;
      case 429:
        userMessage = 'Too many requests. Please wait a moment and try again.';
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        userMessage = 'Server error. Please try again in a few moments.';
        retryable = true;
        break;
      default:
        userMessage = `An error occurred (${error.status}). Please try again.`;
        retryable = true;
    }

    return {
      timestamp,
      userMessage,
      technicalMessage: `HTTP ${error.status}: ${error.message}`,
      retryable,
    };
  }

  private handleClientError(error: Error, timestamp: string): ErrorContext {
    let userMessage = 'An unexpected error occurred. Please refresh the page.';
    let retryable = false;

    if (error.message.includes('ChunkLoadError')) {
      userMessage = 'Failed to load application resources. Please refresh the page.';
      retryable = true;
    } else if (error.message.includes('NetworkError')) {
      userMessage = 'Network error. Please check your connection and try again.';
      retryable = true;
    }

    return {
      timestamp,
      userMessage,
      technicalMessage: error.message,
      retryable,
    };
  }

  private logError(errorContext: ErrorContext): void {
    console.error('[ErrorHandler]', errorContext);
    this.errorLog.push(errorContext);

    if (this.errorLog.length > 50) {
      this.errorLog.shift();
    }
  }

  private displayError(errorContext: ErrorContext): void {
    console.log('[User Message]', errorContext.userMessage);
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    context?: { component?: string; action?: string }
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`Retry attempt ${attempt}/${this.maxRetries} failed:`, error.message);

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    const errorContext: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      userMessage: `Operation failed after ${this.maxRetries} attempts. Please try again later.`,
      technicalMessage: lastError?.message || 'Unknown error',
      retryable: false,
    };

    this.logError(errorContext);
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getErrorLog(): ErrorContext[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }
}
