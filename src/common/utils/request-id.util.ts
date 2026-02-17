import { randomUUID } from 'crypto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveRequestId(header: string | undefined): string {
  if (header && UUID_REGEX.test(header)) {
    return header;
  }
  return randomUUID();
}
