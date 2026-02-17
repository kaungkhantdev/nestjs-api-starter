import * as crypto from 'crypto';
import { buildKey } from './build-key.util';

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

describe('buildKey', () => {
  const mockUUID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    (crypto.randomUUID as jest.Mock).mockReturnValue(mockUUID);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return uuid-prefixed filename without folder', () => {
    const result = buildKey('photo.png');
    expect(result).toBe(`${mockUUID}-photo.png`);
  });

  it('should return folder/uuid-prefixed filename with folder', () => {
    const result = buildKey('photo.png', 'avatars');
    expect(result).toBe(`avatars/${mockUUID}-photo.png`);
  });

  it('should always contain the original filename', () => {
    const result = buildKey('document.pdf');
    expect(result).toContain('document.pdf');
  });

  it('should product unique keys on each call', () => {
    (crypto.randomUUID as jest.Mock)
      .mockReturnValueOnce('uuid-1')
      .mockReturnValueOnce('uuid-2');
    const key1 = buildKey('file.txt');
    const key2 = buildKey('file.txt');
    expect(key1).not.toBe(key2);
  });
});
