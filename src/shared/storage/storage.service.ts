import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  IStorageProvider,
  STORAGE_PROVIDER,
  UploadResult,
} from './interfaces/storage-provider.interface';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class StorageService {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: IStorageProvider,
    private readonly config: ConfigService,
  ) {
    this.maxFileSize =
      this.config.get<number>('storage.maxFileSize') || 5 * 1024 * 1024;
    this.allowedMimeTypes =
      this.config.get<string[]>('storage.allowedMimeTypes') || [];
  }

  async upload(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds the limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed`,
      );
    }

    return this.provider.upload(file, folder);
  }

  async delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  async getUrl(key: string): Promise<string> {
    return this.provider.getUrl(key);
  }
}
