# Storage Guide

This guide explains the Storage module architecture using the **Factory + Adapter Pattern** for multi-provider file storage support.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Design Patterns](#design-patterns)
- [Configuration](#configuration)
- [Implementation](#implementation)
- [Usage Examples](#usage-examples)
- [Adding New Providers](#adding-new-providers)
- [Best Practices](#best-practices)

## Overview

The Storage module provides a unified interface for file storage operations across multiple cloud providers (AWS S3, Azure Blob, Google Cloud Storage) and local filesystem. It uses:

- **Factory Pattern**: Creates only the needed provider at runtime (lazy loading)
- **Adapter Pattern**: Wraps different provider SDKs with a unified interface
- **Strategy Pattern**: Allows switching providers via configuration

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Provider Agnostic** | Same API regardless of storage backend |
| **Lazy Loading** | Only loads the SDK for the active provider |
| **Easy Testing** | Swap to local/mock provider for tests |
| **Configuration Driven** | Switch providers via environment variables |
| **Type Safety** | Full TypeScript support with interfaces |

## Architecture

### Directory Structure

```
src/shared/storage/
├── interfaces/
│   └── storage-provider.interface.ts    # Contract for all providers
├── providers/
│   ├── s3-storage.provider.ts           # AWS S3 implementation
│   ├── azure-storage.provider.ts        # Azure Blob implementation
│   └── local-storage.provider.ts        # Local filesystem (dev/testing)
├── storage.factory.ts                   # Creates provider instances
├── storage.service.ts                   # High-level API with validation
└── storage.module.ts                    # NestJS module definition
```

## Design Patterns

### 1. Factory Pattern

The Factory Pattern creates provider instances based on configuration. Only the required provider is instantiated, saving memory and avoiding unnecessary SDK initialization.

```typescript
// storage.factory.ts
@Injectable()
export class StorageFactory {
  constructor(private readonly configService: ConfigService) {}

  create(): StorageProvider {
    const provider = this.configService.get<string>('storage.provider', 's3');

    switch (provider) {
      case 's3':
        return new S3StorageProvider(this.configService);
      case 'azure':
        return new AzureStorageProvider(this.configService);
      case 'local':
        return new LocalStorageProvider(this.configService);
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
}
```

### 2. Adapter Pattern

Each provider adapts its specific SDK to the common `StorageProvider` interface:

```typescript
// interfaces/storage-provider.interface.ts
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @returns The public URL or key of the uploaded file
   */
  upload(key: string, data: Buffer, options?: UploadOptions): Promise<string>;

  /**
   * Get file contents as Buffer
   */
  get(key: string): Promise<Buffer>;

  /**
   * Get file as a readable stream (for large files)
   */
  getStream(key: string): Promise<Readable>;

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Generate a signed URL for direct download
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Generate a signed URL for direct upload (bypasses server)
   */
  getSignedUploadUrl(key: string, expiresIn?: number): Promise<string>;
}
```

## Configuration

### Environment Variables

```bash
# .env

# Storage Provider: s3 | azure | local
STORAGE_PROVIDER="s3"

# AWS S3
AWS_REGION="us-east-1"
AWS_S3_KEY_ID="your-access-key-id"
AWS_SECRET_S3_KEY="your-secret-access-key"
AWS_S3_BUCKET="your-bucket-name"

# Azure Blob (if using azure provider)
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."
AZURE_STORAGE_CONTAINER="your-container-name"

# Local Storage (if using local provider)
LOCAL_STORAGE_PATH="./uploads"
```

### Config File

```typescript
// src/config/storage.config.ts
export default () => ({
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    s3: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_S3_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_S3_KEY,
      bucket: process.env.AWS_S3_BUCKET,
    },
    azure: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      container: process.env.AZURE_STORAGE_CONTAINER,
    },
    local: {
      path: process.env.LOCAL_STORAGE_PATH || './uploads',
    },
  },
});
```

## Implementation

### S3 Storage Provider

```typescript
// providers/s3-storage.provider.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { StorageProvider, UploadOptions } from '../interfaces/storage-provider.interface';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('storage.s3.bucket');
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('storage.s3.region'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('storage.s3.accessKeyId'),
        secretAccessKey: this.configService.getOrThrow<string>('storage.s3.secretAccessKey'),
      },
    });
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
      ACL: options?.isPublic ? 'public-read' : 'private',
    });

    await this.s3Client.send(command);

    if (options?.isPublic) {
      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as Readable;

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getSignedUploadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
```

### Storage Service (High-Level API)

```typescript
// storage.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { StorageFactory } from './storage.factory';
import { StorageProvider, UploadOptions } from './interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;
  private readonly maxFileSize: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly factory: StorageFactory,
  ) {
    this.provider = this.factory.create();
    this.maxFileSize = this.configService.get<number>(
      'storage.maxFileSize',
      10 * 1024 * 1024,
    );
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<string> {
    if (data.length > this.maxFileSize) {
      throw new BadRequestException(
        `File size ${data.length} exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    return this.provider.upload(key, data, options);
  }

  async get(key: string): Promise<Buffer> {
    return this.provider.get(key);
  }

  async getStream(key: string): Promise<Readable> {
    return this.provider.getStream(key);
  }

  async delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getSignedUrl(key, expiresIn);
  }

  async getSignedUploadUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getSignedUploadUrl(key, expiresIn);
  }
}
```

### Storage Module

```typescript
// storage.module.ts
import { Module } from '@nestjs/common';
import { StorageFactory } from './storage.factory';
import { StorageService } from './storage.service';

@Module({
  providers: [StorageFactory, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

## Usage Examples

### 1. Import the Module

```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { StorageModule } from '@/shared/storage/storage.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### 2. Basic File Upload

```typescript
// users.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '@/shared/storage/storage.service';

@Controller('users')
export class UsersController {
  constructor(private readonly storage: StorageService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    const key = `avatars/${Date.now()}-${file.originalname}`;

    const url = await this.storage.upload(key, file.buffer, {
      contentType: file.mimetype,
      isPublic: true,
    });

    return { url, key };
  }
}
```

### 3. Direct Upload (Large Files)

For large files, let the client upload directly to S3/Azure to avoid server memory issues:

```typescript
// files.controller.ts
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  // Step 1: Get a signed URL for direct upload
  @Post('upload-url')
  async getUploadUrl(@Body() dto: { filename: string; contentType: string }) {
    const key = `uploads/${Date.now()}-${dto.filename}`;
    const url = await this.storage.getSignedUploadUrl(key);

    return {
      uploadUrl: url,
      key,
      expiresIn: 3600,
    };
  }
}
```

Frontend usage:

```typescript
// Frontend code
async function uploadLargeFile(file: File) {
  // 1. Get signed URL from your API
  const { uploadUrl, key } = await fetch('/api/files/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  }).then(r => r.json());

  // 2. Upload directly to S3 (bypasses your server)
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  return key;
}
```

### 4. Streaming Download (Large Files)

```typescript
@Get(':key')
async downloadFile(@Param('key') key: string, @Res() res: Response) {
  const stream = await this.storage.getStream(key);

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${key}"`);

  stream.pipe(res);
}
```

### 5. Redirect to Signed URL (Best for CDN)

```typescript
@Get(':key')
async downloadFile(@Param('key') key: string, @Res() res: Response) {
  const signedUrl = await this.storage.getSignedUrl(key, 300); // 5 min expiry
  res.redirect(signedUrl);
}
```

## Adding New Providers

To add a new storage provider (e.g., Google Cloud Storage):

### 1. Create the Provider

```typescript
// providers/gcs-storage.provider.ts
import { Storage } from '@google-cloud/storage';
import { StorageProvider, UploadOptions } from '../interfaces/storage-provider.interface';

export class GcsStorageProvider implements StorageProvider {
  private readonly storage: Storage;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('storage.gcs.bucket');
    this.storage = new Storage({
      projectId: this.configService.getOrThrow<string>('storage.gcs.projectId'),
      keyFilename: this.configService.get<string>('storage.gcs.keyFilename'),
    });
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<string> {
    const file = this.storage.bucket(this.bucket).file(key);
    await file.save(data, {
      contentType: options?.contentType,
      metadata: options?.metadata,
    });
    return key;
  }

  // ... implement other methods
}
```

### 2. Update the Factory

```typescript
// storage.factory.ts
create(): StorageProvider {
  const provider = this.configService.get<string>('storage.provider', 's3');

  switch (provider) {
    case 's3':
      return new S3StorageProvider(this.configService);
    case 'azure':
      return new AzureStorageProvider(this.configService);
    case 'gcs':  // Add new case
      return new GcsStorageProvider(this.configService);
    case 'local':
      return new LocalStorageProvider(this.configService);
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
```

### 3. Update Configuration

```typescript
// storage.config.ts
export default () => ({
  storage: {
    // ...existing config
    gcs: {
      projectId: process.env.GCS_PROJECT_ID,
      bucket: process.env.GCS_BUCKET,
      keyFilename: process.env.GCS_KEY_FILENAME,
    },
  },
});
```

## Best Practices

### 1. Use Meaningful Keys

```typescript
// Good: Organized, unique, includes metadata
const key = `users/${userId}/avatars/${Date.now()}-${sanitizedFilename}`;

// Bad: Flat, potential collisions
const key = file.originalname;
```

### 2. Validate Files Before Upload

```typescript
async upload(file: Express.Multer.File) {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException('Invalid file type');
  }

  // Validate file size (also enforced in StorageService)
  if (file.size > 5 * 1024 * 1024) {
    throw new BadRequestException('File too large');
  }

  return this.storage.upload(key, file.buffer, { contentType: file.mimetype });
}
```

### 3. Use Direct Uploads for Large Files

| File Size | Approach |
|-----------|----------|
| < 5MB | Upload through server |
| 5MB - 100MB | Signed URL direct upload |
| > 100MB | Multipart upload with signed URLs |

### 4. Set Appropriate Expiry Times

```typescript
// Short expiry for sensitive files
const sensitiveUrl = await this.storage.getSignedUrl(key, 300); // 5 minutes

// Longer expiry for public-ish content
const mediaUrl = await this.storage.getSignedUrl(key, 86400); // 24 hours
```

### 5. Use Local Provider for Development

```bash
# .env.development
STORAGE_PROVIDER="local"
LOCAL_STORAGE_PATH="./uploads"

# .env.production
STORAGE_PROVIDER="s3"
```

### 6. Handle Errors Gracefully

```typescript
async getFile(key: string): Promise<Buffer> {
  try {
    return await this.storage.get(key);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.code === 'BlobNotFound') {
      throw new NotFoundException(`File not found: ${key}`);
    }
    throw error;
  }
}
```
