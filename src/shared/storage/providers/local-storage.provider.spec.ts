import { LocalStorageProvider } from './local-storage.provider';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
jest.mock('fs/promises');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

const FAKE_BASE = '/fake/uploads';

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  const mockUUID = '550e8400-e29b-41d4-a716-446655440000';

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'storage.local.path') return FAKE_BASE;
      return undefined;
    }),
  } as unknown as ConfigService;

  const mockFile = {
    originalname: 'test.png',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  beforeEach(() => {
    (crypto.randomUUID as jest.Mock).mockReturnValue(mockUUID);
    provider = new LocalStorageProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should create directory and write file without folder', async () => {
      const result = await provider.upload(mockFile);

      expect(fs.mkdir).toHaveBeenCalledWith(FAKE_BASE, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        `${FAKE_BASE}/${mockUUID}.png`,
        mockFile.buffer,
      );
      expect(result).toEqual({
        key: `${mockUUID}.png`,
        url: `/uploads/${mockUUID}.png`,
        mimetype: 'image/png',
        size: 1024,
      });
    });

    it('should create subdirectory and write file with folder', async () => {
      const result = await provider.upload(mockFile, 'images');

      expect(fs.mkdir).toHaveBeenCalledWith(`${FAKE_BASE}/images`, {
        recursive: true,
      });
      expect(result.key).toBe(`images/${mockUUID}.png`);
      expect(result.url).toBe(`/uploads/images/${mockUUID}.png`);
    });

    it('should return correct UploadResult shape', async () => {
      const result = await provider.upload(mockFile);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('mimetype', 'image/png');
      expect(result).toHaveProperty('size', 1024);
    });
  });

  describe('delete', () => {
    it('should unlink file at correct path', async () => {
      await provider.delete('images/file.png');

      expect(fs.unlink).toHaveBeenCalledWith(`${FAKE_BASE}/images/file.png`);
    });
  });

  describe('getUrl', () => {
    it('should return /uploads/ prefixed URL', () => {
      const url = provider.getUrl('images/file.png');
      expect(url).toBe('/uploads/images/file.png');
    });
  });
});
