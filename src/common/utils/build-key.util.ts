import { randomUUID } from 'crypto';

export function buildKey(originalname: string, folder?: string): string {
  const name = `${randomUUID()}-${originalname}`;
  return folder ? `${folder}/${name}` : name;
}
