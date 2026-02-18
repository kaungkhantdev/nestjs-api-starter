import { parseCorsOrigins } from './parse-cors-origins.util';

describe('parseCorsOrigins', () => {
  it('should throw when value is undefined', () => {
    expect(() => parseCorsOrigins(undefined)).toThrow(
      'FRONTEND_URL environment variable is required',
    );
  });

  it('should throw when value is an empty string', () => {
    expect(() => parseCorsOrigins('')).toThrow(
      'FRONTEND_URL environment variable is required',
    );
  });

  it('should return a single string when no comma is present', () => {
    const result = parseCorsOrigins('https://example.com');
    expect(result).toBe('https://example.com');
  });

  it('should return an array of trimmed strings when value contains commas', () => {
    const result = parseCorsOrigins('https://example.com,https://other.com');
    expect(result).toEqual(['https://example.com', 'https://other.com']);
  });

  it('should trim whitespace around each origin in a comma-separated list', () => {
    const result = parseCorsOrigins(
      '  https://example.com  ,  https://other.com  ',
    );
    expect(result).toEqual(['https://example.com', 'https://other.com']);
  });

  it('should return an array even when only two origins are provided', () => {
    const result = parseCorsOrigins('https://a.com,https://b.com');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle more than two comma-separated origins', () => {
    const result = parseCorsOrigins(
      'https://a.com,https://b.com,https://c.com',
    );
    expect(result).toEqual(['https://a.com', 'https://b.com', 'https://c.com']);
  });

  it('should return a plain string (not an array) for a single origin', () => {
    const result = parseCorsOrigins('https://example.com');
    expect(typeof result).toBe('string');
  });
});
