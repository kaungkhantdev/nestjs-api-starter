import { Readable } from 'stream';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export interface StorageProvider {
  upload(key: string, data: Buffer, options?: UploadOptions): Promise<string>; // returns URL
  get(key: string): Promise<Buffer>;
  getStream(key: string): Promise<Readable>; // For large files
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>; // Direct download
  getSignedUploadUrl(key: string, expiresIn?: number): Promise<string>; // Direct upload
}
