import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  IStorageProvider,
  UploadResult,
} from '../interfaces/storage-provider.interface';
import { ConfigService } from '@nestjs/config';
import { buildKey } from '../utils/build-key.util';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('storage.s3.bucket') || '';
    this.client = new S3Client({
      region: config.get<string>('storage.s3.region') || '',
      credentials: {
        accessKeyId: config.get<string>('storage.s3.accessKeyId') || '',
        secretAccessKey: config.get<string>('storage.s3.secretAccessKey') || '',
      },
    });
  }

  async upload(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    const key = buildKey(file.originalname, folder);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return {
      key,
      url: await this.getUrl(key),
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: 3600 },
    );
  }
}
