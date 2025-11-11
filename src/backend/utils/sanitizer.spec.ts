import { Sanitizer } from './sanitizer';

describe('Sanitizer', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      const result = Sanitizer.sanitizeString(input);
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toBe('Hello alert("XSS") World');
    });

    it('should remove all HTML tags', () => {
      const input = '<div><p>Hello</p><span>World</span></div>';
      const result = Sanitizer.sanitizeString(input);
      
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<span>');
      expect(result).toBe('HelloWorld');
    });

    it('should handle empty strings', () => {
      expect(Sanitizer.sanitizeString('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(Sanitizer.sanitizeString(null as any)).toBe(null);
      expect(Sanitizer.sanitizeString(undefined as any)).toBe(undefined);
    });

    it('should preserve plain text', () => {
      const input = 'This is plain text';
      const result = Sanitizer.sanitizeString(input);
      
      expect(result).toBe(input);
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = Sanitizer.sanitizeString(input);
      
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = Sanitizer.sanitizeString(input);
      
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties', () => {
      const input = {
        title: 'Hello <script>alert("XSS")</script>',
        description: 'Safe text'
      };
      
      const result = Sanitizer.sanitizeObject(input);
      
      expect(result.title).not.toContain('<script>');
      expect(result.title).toBe('Hello alert("XSS")');
      expect(result.description).toBe('Safe text');
    });

    it('should sanitize nested objects', () => {
      const input = {
        form: {
          title: '<script>alert(1)</script>Form',
          field: {
            label: '<b>Bold</b> Label'
          }
        }
      };
      
      const result = Sanitizer.sanitizeObject(input);
      
      expect(result.form.title).not.toContain('<script>');
      expect(result.form.field.label).not.toContain('<b>');
      expect(result.form.field.label).toBe('Bold Label');
    });

    it('should sanitize arrays', () => {
      const input = {
        items: [
          '<script>alert(1)</script>',
          'Safe text',
          '<img src=x onerror=alert(1)>'
        ]
      };
      
      const result = Sanitizer.sanitizeObject(input);
      
      expect(result.items[0]).not.toContain('<script>');
      expect(result.items[1]).toBe('Safe text');
      expect(result.items[2]).not.toContain('<img>');
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        enabled: true,
        value: null,
        items: [1, 2, 3]
      };
      
      const result = Sanitizer.sanitizeObject(input);
      
      expect(result.count).toBe(42);
      expect(result.enabled).toBe(true);
      expect(result.value).toBe(null);
      expect(result.items).toEqual([1, 2, 3]);
    });

    it('should handle complex nested structures', () => {
      const input = {
        schema: {
          fields: [
            {
              name: 'email',
              label: '<script>XSS</script>Email',
              options: [
                { value: 1, label: '<b>Option 1</b>' },
                { value: 2, label: 'Option 2' }
              ]
            }
          ]
        }
      };
      
      const result = Sanitizer.sanitizeObject(input);
      
      expect(result.schema.fields[0].label).not.toContain('<script>');
      expect(result.schema.fields[0].options[0].label).not.toContain('<b>');
      expect(result.schema.fields[0].options[0].label).toBe('Option 1');
    });
  });
});
