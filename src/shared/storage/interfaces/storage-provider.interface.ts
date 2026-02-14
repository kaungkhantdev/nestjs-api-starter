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
