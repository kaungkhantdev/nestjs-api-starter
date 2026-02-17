import { validateEnvSecret } from './validate-env.util';

describe('validateEnvSecret', () => {
  const VALID_SECRET = 'a'.repeat(32); // exactly 32 characters (default minLength)

  describe('when the value is missing', () => {
    it('should throw when value is undefined', () => {
      expect(() => validateEnvSecret('MY_SECRET', undefined)).toThrow(
        'MY_SECRET environment variable is not defined',
      );
    });

    it('should throw when value is an empty string', () => {
      expect(() => validateEnvSecret('MY_SECRET', '')).toThrow(
        'MY_SECRET environment variable is not defined',
      );
    });

    it('should include the variable name in the error message', () => {
      expect(() => validateEnvSecret('JWT_SECRET', undefined)).toThrow(
        'JWT_SECRET environment variable is not defined',
      );
    });
  });

  describe('when the value is too short', () => {
    it('should throw when value is shorter than the default minLength of 32', () => {
      expect(() => validateEnvSecret('MY_SECRET', 'short')).toThrow(
        'MY_SECRET must be at least 32 characters long',
      );
    });

    it('should throw when value is shorter than a custom minLength', () => {
      expect(() => validateEnvSecret('MY_SECRET', 'abc', 10)).toThrow(
        'MY_SECRET must be at least 10 characters long',
      );
    });

    it('should include the minLength in the error message', () => {
      expect(() => validateEnvSecret('API_KEY', 'tooshort', 64)).toThrow(
        'API_KEY must be at least 64 characters long',
      );
    });

    it('should throw when value is exactly one character below minLength', () => {
      const almostValid = 'a'.repeat(31);
      expect(() => validateEnvSecret('MY_SECRET', almostValid)).toThrow(
        'MY_SECRET must be at least 32 characters long',
      );
    });
  });

  describe('when the value is valid', () => {
    it('should return the value when it meets the default minLength', () => {
      const result = validateEnvSecret('MY_SECRET', VALID_SECRET);

      expect(result).toBe(VALID_SECRET);
    });

    it('should return the value when it exceeds the default minLength', () => {
      const longSecret = 'a'.repeat(64);

      const result = validateEnvSecret('MY_SECRET', longSecret);

      expect(result).toBe(longSecret);
    });

    it('should return the value when it meets a custom minLength', () => {
      const secret = 'abc123';

      const result = validateEnvSecret('MY_SECRET', secret, 6);

      expect(result).toBe(secret);
    });

    it('should return the value when it is exactly at minLength', () => {
      const result = validateEnvSecret('MY_SECRET', VALID_SECRET, 32);

      expect(result).toBe(VALID_SECRET);
    });
  });
});
