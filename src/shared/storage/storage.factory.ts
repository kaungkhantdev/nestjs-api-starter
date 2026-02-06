import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { S3StorageProvider } from './providers/s3-storage.provider';

@Injectable()
export class StorageFactory {
  constructor(private readonly configService: ConfigService) {}

  create(): StorageProvider {
    const provider = this.configService.get<string>('storage.provider', 's3');

    switch (provider) {
      case 's3':
        return new S3StorageProvider(this.configService);
      // case 'azure':
      //   return new AzureStorageProvider(this.configService);
      // case 'local':
      //   return new LocalStorageProvider(this.configService);
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
}
