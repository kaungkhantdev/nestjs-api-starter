# Central File Upload Module

## Context

Storage config (`storage.config.ts`) and AWS S3 SDK are already in place. This is a provider-agnostic `StorageModule` using the strategy pattern.

## Module Structure

```
src/shared/storage/
├── interfaces/
│   └── storage-provider.interface.ts   # IStorageProvider, UploadResult, STORAGE_PROVIDER token
├── providers/
│   ├── s3-storage.provider.ts          # S3StorageProvider
│   └── local-storage.provider.ts       # LocalStorageProvider
├── utils/
│   └── build-key.util.ts              # buildKey() helper
├── storage.service.ts                  # Validates files, delegates to active provider
├── storage.controller.ts               # Upload / delete / get-url endpoints
└── storage.module.ts                   # Global module, factory-selects provider from config
```

## Design

- **Strategy pattern** — `IStorageProvider` interface with implementations (S3, Local)
- **Factory provider** — reads `STORAGE_PROVIDER` env var at startup, instantiates the matching provider
- **`@Global()` module** — any module can inject `StorageService` without importing
- **`@Injectable()` providers** — all providers are decorated with `@Injectable()` for NestJS DI compatibility
- **Validation** — checks file size and mime type from existing `storage.config.ts`
- **Multer** — controller uses `FileInterceptor` / `FilesInterceptor` for multipart handling

## Multer Type Note

You may see `Namespace 'global.Express' has no exported member 'Multer'` in your IDE. This is a VSCode-only issue — `tsc` compiles cleanly. The `@types/multer` package augments the global `Express` namespace, but VSCode's TS server sometimes fails to resolve it.

**Fix:** If the IDE error persists after restarting the TS server (`Cmd+Shift+P` → `TypeScript: Restart TS Server`), add a type reference file:

```ts
// src/types/global.d.ts
import 'multer';
```

## API Endpoints

| Method   | Path                              | Description           | Auth |
|----------|-----------------------------------|-----------------------|------|
| `POST`   | `/api/v1/storage/upload`          | Upload single file    | JWT  |
| `POST`   | `/api/v1/storage/upload/multiple` | Upload multiple files | JWT  |
| `DELETE` | `/api/v1/storage/:key`            | Delete file by key    | JWT  |
| `GET`    | `/api/v1/storage/url/:key`        | Get download URL      | JWT  |

## Usage by Other Modules

```ts
constructor(private readonly storageService: StorageService) {}

async uploadAvatar(file: Express.Multer.File) {
  return this.storageService.upload(file, 'avatars');
}
```

---

## Code

### `interfaces/storage-provider.interface.ts`

```ts
export const STORAGE_PROVIDER = Symbol('IStorageProvider');

export interface UploadResult {
  key: string;
  url: string;
  mimetype: string;
  size: number;
}

export interface IStorageProvider {
  upload(file: Express.Multer.File, folder?: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string> | string;
}
```

### `utils/build-key.util.ts`

```ts
import { randomUUID } from 'crypto';

export function buildKey(originalname: string, folder?: string): string {
  const name = `${randomUUID()}-${originalname}`;
  return folder ? `${folder}/${name}` : name;
}
```

### `providers/s3-storage.provider.ts`

```ts
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

  async upload(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    const key = buildKey(file.originalname, folder);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return { key, url: await this.getUrl(key), mimetype: file.mimetype, size: file.size };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 },
    );
  }
}
```

### `providers/local-storage.provider.ts`

```ts
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

  async upload(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    const dir = folder ? path.join(this.basePath, folder) : this.basePath;
    await fs.mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}-${file.originalname}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    const key = folder ? `${folder}/${filename}` : filename;
    return { key, url: `/uploads/${key}`, mimetype: file.mimetype, size: file.size };
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.basePath, key));
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
```

### `storage.service.ts`

```ts
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
    this.maxFileSize = this.config.get<number>('storage.maxFileSize') || 5;
    this.allowedMimeTypes =
      this.config.get<string[]>('storage.allowedMimeTypes') || [];
  }

  async upload(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
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
```

### `storage.controller.ts`

```ts
import {
  Controller, Post, Delete, Get, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiConsumes, ApiBody, ApiQuery, ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/role.guard';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'storage', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiQuery({ name: 'folder', required: false, type: String })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.storageService.upload(file, folder);
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiQuery({ name: 'folder', required: false, type: String })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    return Promise.all(
      files.map((file) => this.storageService.upload(file, folder)),
    );
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file by key' })
  @ApiParam({ name: 'key', type: String })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async delete(@Param('key') key: string) {
    await this.storageService.delete(key);
    return { message: 'File deleted successfully' };
  }

  @Get('url/:key')
  @ApiOperation({ summary: 'Get download URL for a file' })
  @ApiParam({ name: 'key', type: String })
  @ApiResponse({ status: 200, description: 'URL retrieved successfully' })
  async getUrl(@Param('key') key: string) {
    return { url: await this.storageService.getUrl(key) };
  }
}
```

### `storage.module.ts`

```ts
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
```
