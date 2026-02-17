import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IStorageProvider,
  UploadResult,
} from '../interfaces/storage-provider.interface';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

// Allowed folder name pattern — alphanumeric, hyphens, underscores, forward slash
const SAFE_FOLDER_PATTERN = /^[a-zA-Z0-9_\-/]+$/;
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly basePath: string;

  constructor(config: ConfigService) {
    this.basePath = config.get<string>('storage.local.path') || './uploads';
  }

  private safePath(userInput: string): string {
    const resolved = path.resolve(this.basePath, userInput);
    if (
      !resolved.startsWith(this.basePath + path.sep) &&
      resolved !== this.basePath
    ) {
      throw new BadRequestException('Invalid file path');
    }
    return resolved;
  }

  private safeExtension(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[mimetype] ?? '';
  }

  async upload(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    if (folder && !SAFE_FOLDER_PATTERN.test(folder)) {
      throw new BadRequestException('Invalid folder name');
    }

    const dir = folder ? this.safePath(folder) : this.basePath;
    await fs.mkdir(dir, { recursive: true });

    // Use UUID-only filename
    const ext = this.safeExtension(file.mimetype);
    const filename = `${randomUUID()}${ext}`;
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
    await fs.unlink(this.safePath(key));
  }

  getUrl(key: string): string {
    this.safePath(key);
    return `/uploads/${key}`;
  }
}
