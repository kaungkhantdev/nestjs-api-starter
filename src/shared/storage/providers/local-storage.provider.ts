import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IStorageProvider,
  UploadResult,
} from '../interfaces/storage-provider.interface';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly basePath: string;

  constructor(config: ConfigService) {
    this.basePath = config.get<string>('storage.local.path') || './uploads';
  }

  async upload(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    const dir = folder ? path.join(this.basePath, folder) : this.basePath;
    await fs.mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}-${file.originalname}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    const key = folder ? `${folder}/${filename}` : filename;
    return {
      key,
      url: `/uploads/${key}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.basePath, key));
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
