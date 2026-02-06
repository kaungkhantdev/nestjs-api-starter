import { Readable } from 'stream';

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
