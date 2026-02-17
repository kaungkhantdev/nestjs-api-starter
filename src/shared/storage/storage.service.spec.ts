import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from './interfaces/storage-provider.interface';

describe('StorageService', () => {
  let service: StorageService;
  let mockProvider: jest.Mocked<IStorageProvider>;

  const mockUploadResult = {
    key: 'test-key',
    url: 'https://example.com/test-key',
    mimetype: 'image/png',
    size: 1024,
  };

  const mockFile = {
    originalname: 'test.png',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  beforeEach(async () => {
    mockProvider = {
      upload: jest.fn().mockResolvedValue(mockUploadResult),
      delete: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn().mockResolvedValue('https://example.com/test-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: STORAGE_PROVIDER, useValue: mockProvider },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'storage.maxFileSize') return 10 * 1024 * 1024; // 10MB
              if (key === 'storage.allowedMimeTypes')
                return ['image/png', 'image/jpeg'];
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload valid file successfully', async () => {
      const result = await service.upload(mockFile);

      expect(mockProvider.upload).toHaveBeenCalledWith(mockFile, undefined);
      expect(result).toEqual(mockUploadResult);
    });

    it('should pass folder to provider', async () => {
      await service.upload(mockFile, 'avatars');

      expect(mockProvider.upload).toHaveBeenCalledWith(mockFile, 'avatars');
    });

    it('should throw BadRequestException when file exceeds max size', async () => {
      const largeFile = { ...mockFile, size: 20 * 1024 * 1024 };

      await expect(
        service.upload(largeFile as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'text/plain' };

      await expect(
        service.upload(invalidFile as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not call provider when file is too large', async () => {
      const largeFile = { ...mockFile, size: 20 * 1024 * 1024 };

      await expect(
        service.upload(largeFile as Express.Multer.File),
      ).rejects.toThrow();
      expect(mockProvider.upload).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delegate to provider', async () => {
      await service.delete('test-key');

      expect(mockProvider.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('getUrl', () => {
    it('should delegate to provider', async () => {
      const url = await service.getUrl('test-key');

      expect(mockProvider.getUrl).toHaveBeenCalledWith('test-key');
      expect(url).toBe('https://example.com/test-key');
    });
  });
});
