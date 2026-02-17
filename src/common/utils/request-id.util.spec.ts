import * as crypto from 'crypto';
import { resolveRequestId } from './request-id.util';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

describe('resolveRequestId', () => {
  const mockUUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    (crypto.randomUUID as jest.Mock).mockReturnValue(mockUUID);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when a valid UUID header is provided', () => {
    it('should return the header value as-is', () => {
      const validUUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      const result = resolveRequestId(validUUID);

      expect(result).toBe(validUUID);
      expect(crypto.randomUUID).not.toHaveBeenCalled();
    });

    it('should accept uppercase UUID', () => {
      const upperUUID = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';

      const result = resolveRequestId(upperUUID);

      expect(result).toBe(upperUUID);
      expect(crypto.randomUUID).not.toHaveBeenCalled();
    });
  });

  describe('when the header is missing or invalid', () => {
    it('should generate a new UUID when header is undefined', () => {
      const result = resolveRequestId(undefined);

      expect(result).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it('should generate a new UUID when header is an empty string', () => {
      const result = resolveRequestId('');

      expect(result).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it('should generate a new UUID when header is not a valid UUID', () => {
      const result = resolveRequestId('not-a-valid-uuid');

      expect(result).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it('should generate a new UUID when header is a plain string', () => {
      const result = resolveRequestId('request-123');

      expect(result).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it('should generate a new UUID when header has wrong UUID format', () => {
      // Missing one segment
      const result = resolveRequestId('a1b2c3d4-e5f6-7890-abcd');

      expect(result).toBe(mockUUID);
      expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    });
  });
});
