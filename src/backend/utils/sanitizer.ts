/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses regex-based approach for backend sanitization
 */
export class Sanitizer {
  /**
   * Sanitize a string value by removing HTML tags and dangerous patterns
   */
  static sanitizeString(value: string): string {
    if (!value || typeof value !== 'string') return value;
    
    let sanitized = value.replace(/<[^>]*>/g, '');
    
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    
    return sanitized;
  }

  /**
   * Sanitize an object recursively
   */
  static sanitizeObject<T>(obj: T): T {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj) as any;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item)) as any;
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}
