# Storage Module Guide

A provider-agnostic file storage module using the strategy pattern. Supports AWS S3 and local disk out of the box. The module is `@Global()`, so `StorageService` is available everywhere without importing `StorageModule`.

---

## Module Structure

```
src/
├── common/utils/
│   └── build-key.util.ts                   # UUID-based key builder (shared util)
├── config/
│   └── storage.config.ts                   # Reads env vars, sets defaults
└── shared/storage/
    ├── interfaces/
    │   └── storage-provider.interface.ts   # IStorageProvider, UploadResult, STORAGE_PROVIDER token
    ├── providers/
    │   ├── s3-storage.provider.ts          # AWS S3 implementation
    │   └── local-storage.provider.ts       # Local disk implementation
    ├── storage.service.ts                  # Validates files, delegates to active provider
    ├── storage.controller.ts               # HTTP upload / delete / get-url endpoints
    └── storage.module.ts                   # Global module, factory-selects provider from config
```

---

## Configuration

All config is read from environment variables via `src/config/storage.config.ts`.

### Environment Variables

| Variable             | Default      | Description                                 |
|----------------------|--------------|---------------------------------------------|
| `STORAGE_PROVIDER`   | `s3`         | Active provider: `s3` or `local`            |
| `MAX_FILE_SIZE_MB`   | `10`         | Maximum upload size in MB                   |
| `AWS_REGION`         | —            | S3 region (S3 only)                         |
| `AWS_S3_KEY_ID`      | —            | AWS access key ID (S3 only)                 |
| `AWS_SECRET_S3_KEY`  | —            | AWS secret access key (S3 only)             |
| `AWS_S3_BUCKET`      | —            | S3 bucket name (S3 only)                    |
| `LOCAL_STORAGE_PATH` | `./uploads`  | Absolute or relative base path (local only) |

### Allowed MIME Types (hardcoded defaults)

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`

To extend the list, update `allowedMimeTypes` in [src/config/storage.config.ts](src/config/storage.config.ts).

### Example `.env`

```env
# Use local disk during development
STORAGE_PROVIDER=local
MAX_FILE_SIZE_MB=5
LOCAL_STORAGE_PATH=./uploads

# Use S3 in production
# STORAGE_PROVIDER=s3
# AWS_REGION=us-east-1
# AWS_S3_KEY_ID=AKIA...
# AWS_SECRET_S3_KEY=...
# AWS_S3_BUCKET=my-bucket
```

---

## How to Use

### Inject StorageService into any service

Because `StorageModule` is `@Global()`, you only need to inject `StorageService` — no module import required.

```ts
import { StorageService } from '@/shared/storage/storage.service';
import { UploadResult } from '@/shared/storage/interfaces/storage-provider.interface';

@Injectable()
export class UsersService {
  constructor(private readonly storageService: StorageService) {}

  async uploadAvatar(file: Express.Multer.File): Promise<UploadResult> {
    // Upload to the 'avatars' folder
    return this.storageService.upload(file, 'avatars');
  }

  async removeAvatar(key: string): Promise<void> {
    await this.storageService.delete(key);
  }

  async getAvatarUrl(key: string): Promise<string> {
    return this.storageService.getUrl(key);
  }
}
```

### Accept file uploads in a controller

```ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(file);
  }
}
```

### StorageService API

| Method                                   | Returns                 | Description                                   |
|------------------------------------------|-------------------------|-----------------------------------------------|
| `upload(file, folder?)`                  | `Promise<UploadResult>` | Validates then uploads; throws on rule breach |
| `delete(key)`                            | `Promise<void>`         | Deletes file by its storage key               |
| `getUrl(key)`                            | `Promise<string>`       | Returns a download URL (signed for S3)        |

**`UploadResult` shape:**

```ts
{
  key: string;      // Storage path, e.g. "avatars/uuid.jpg"
  url: string;      // Download URL (signed URL for S3, /uploads/... for local)
  mimetype: string; // Detected MIME type
  size: number;     // File size in bytes
}
```

**Validation errors thrown by `upload()`:**

- `400 Bad Request` — file exceeds `MAX_FILE_SIZE_MB`
- `400 Bad Request` — MIME type not in `allowedMimeTypes`

---

## HTTP API

All endpoints require a valid JWT (`Authorization: Bearer <token>`).

| Method   | Path                              | Body / Params                       | Description              |
|----------|-----------------------------------|-------------------------------------|--------------------------|
| `POST`   | `/api/v1/storage/upload`          | `multipart/form-data` field `file`  | Upload a single file     |
| `POST`   | `/api/v1/storage/upload/multiple` | `multipart/form-data` field `files` | Upload up to 10 files    |
| `DELETE` | `/api/v1/storage/:key`            | Path param `key`                    | Delete file by key       |
| `GET`    | `/api/v1/storage/url/:key`        | Path param `key`                    | Get download URL for key |

Both upload endpoints accept an optional `?folder=<name>` query parameter to place the file in a subfolder.

### Example: upload with curl

```bash
# Single file
curl -X POST https://api.example.com/api/v1/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/photo.jpg" \
  -F "" \
  "?folder=avatars"

# Multiple files
curl -X POST https://api.example.com/api/v1/storage/upload/multiple \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"
```

### Example response

```json
{
  "key": "avatars/550e8400-e29b-41d4-a716-446655440000.jpg",
  "url": "https://bucket.s3.amazonaws.com/avatars/550e...?X-Amz-Signature=...",
  "mimetype": "image/jpeg",
  "size": 204800
}
```

---

## Providers

### S3 Provider

- Uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
- Keys are built by `buildKey()`: `{folder}/{uuid}-{originalname}`.
- `getUrl()` returns a **pre-signed URL** valid for **1 hour** (`expiresIn: 3600`).
- Deletes use `DeleteObjectCommand` — no soft delete.

### Local Provider

- Writes files to `LOCAL_STORAGE_PATH` (default `./uploads`).
- Uses UUID-only filenames (`{uuid}.{ext}`) derived from the MIME type — the original filename is never persisted to disk.
- `getUrl()` returns a static path `/uploads/{key}`. Serve this directory with a static file middleware or reverse proxy.
- Path traversal is blocked: any key or folder that resolves outside `basePath` throws a `400`.

---

## Implementing a New Provider

1. Create `src/shared/storage/providers/my-storage.provider.ts` and implement `IStorageProvider`:

```ts
import { Injectable } from '@nestjs/common';
import { IStorageProvider, UploadResult } from '../interfaces/storage-provider.interface';

@Injectable()
export class MyStorageProvider implements IStorageProvider {
  async upload(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    // ...
  }

  async delete(key: string): Promise<void> {
    // ...
  }

  getUrl(key: string): string {
    // ...
  }
}
```

2. Register it in [src/shared/storage/storage.module.ts](src/shared/storage/storage.module.ts) inside the factory:

```ts
return provider === 'my-provider'
  ? new MyStorageProvider(config)
  : new S3StorageProvider(config);
```

3. Set `STORAGE_PROVIDER=my-provider` in your environment.

---

## Multer Type Note

You may see `Namespace 'global.Express' has no exported member 'Multer'` in the IDE. This is a VSCode-only issue — `tsc` compiles cleanly. `@types/multer` augments the global `Express` namespace, but VSCode's TS server sometimes fails to resolve it.

**Fix:** Restart the TS server (`Cmd+Shift+P` → `TypeScript: Restart TS Server`). If the error persists, add a type reference file:

```ts
// src/types/global.d.ts
import 'multer';
```
