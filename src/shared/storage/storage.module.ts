import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Global()
@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('storage.provider');
        return provider === 'local'
          ? new LocalStorageProvider(config)
          : new S3StorageProvider(config);
      },
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
