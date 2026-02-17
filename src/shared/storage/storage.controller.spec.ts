import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

describe('StorageController', () => {
  let controller: StorageController;
  let mockService: jest.Mocked<StorageService>;

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
    mockService = {
      upload: jest.fn().mockResolvedValue(mockUploadResult),
      delete: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn().mockResolvedValue('https://example.com/test-key'),
    } as unknown as jest.Mocked<StorageService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: mockService }],
    }).compile();

    controller = module.get<StorageController>(StorageController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload a single file', async () => {
      const result = await controller.upload(mockFile, 'avatars');

      expect(mockService.upload).toHaveBeenCalledWith(mockFile, 'avatars');
      expect(result).toEqual(mockUploadResult);
    });

    it('should upload without folder', async () => {
      await controller.upload(mockFile);

      expect(mockService.upload).toHaveBeenCalledWith(mockFile, undefined);
    });
  });

  describe('uploadMultiple', () => {
    it('should upload multiple files', async () => {
      const files = [mockFile, mockFile];
      const result = await controller.uploadMultiple(files, 'images');

      expect(mockService.upload).toHaveBeenCalledTimes(2);
      expect(result).toEqual([mockUploadResult, mockUploadResult]);
    });
  });

  describe('delete', () => {
    it('should delete file and return success message', async () => {
      const result = await controller.delete('test-key');

      expect(mockService.delete).toHaveBeenCalledWith('test-key');
      expect(result).toEqual({ message: 'File deleted successfully' });
    });
  });

  describe('getUrl', () => {
    it('should return URL object', async () => {
      const result = await controller.getUrl('test-key');

      expect(mockService.getUrl).toHaveBeenCalledWith('test-key');
      expect(result).toEqual({ url: 'https://example.com/test-key' });
    });
  });
});
