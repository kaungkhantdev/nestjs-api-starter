import { S3StorageProvider } from './s3-storage.provider';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as buildKeyUtil from '@/common/utils/build-key.util';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@/common/utils/build-key.util');

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;
  let mockSend: jest.Mock;

  const s3Config: Record<string, any> = {
    'storage.s3.bucket': 'test-bucket',
    'storage.s3.region': 'eu-west-1',
    'storage.s3.accessKeyId': 'test-key',
    'storage.s3.secretAccessKey': 'test-secret',
  };

  const mockConfig = {
    get: jest.fn((key: string) => s3Config[key]),
  } as unknown as ConfigService;

  const mockFile = {
    originalname: 'test.png',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  beforeEach(() => {
    mockSend = jest.fn().mockResolvedValue({});
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    (getSignedUrl as jest.Mock).mockResolvedValue(
      'https://signed-url.example.com',
    );
    (buildKeyUtil.buildKey as jest.Mock).mockReturnValue('mock-key');

    provider = new S3StorageProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize S3Client with config values', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'eu-west-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });
    });

    it('should default region to us-east-1 when config is empty', () => {
      const emptyConfig = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService;

      new S3StorageProvider(emptyConfig);

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'us-east-1' }),
      );
    });
  });

  describe('upload', () => {
    it('should send PutObjectCommand with correct params', async () => {
      await provider.upload(mockFile);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'mock-key',
        Body: mockFile.buffer,
        ContentType: 'image/png',
      });
    });

    it('should return correct UploadResult with presigned URL', async () => {
      const result = await provider.upload(mockFile);

      expect(result).toEqual({
        key: 'mock-key',
        url: 'https://signed-url.example.com',
        mimetype: 'image/png',
        size: 1024,
      });
    });

    it('should pass folder to buildKey', async () => {
      await provider.upload(mockFile, 'avatars');

      expect(buildKeyUtil.buildKey).toHaveBeenCalledWith('test.png', 'avatars');
    });
  });

  describe('delete', () => {
    it('should send DeleteObjectCommand with correct params', async () => {
      await provider.delete('some-key');

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'some-key',
      });
    });
  });

  describe('getUrl', () => {
    it('should generate presigned URL with 3600s expiry', async () => {
      const url = await provider.getUrl('some-key');

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 3600 },
      );
      expect(url).toBe('https://signed-url.example.com');
    });
  });
});
