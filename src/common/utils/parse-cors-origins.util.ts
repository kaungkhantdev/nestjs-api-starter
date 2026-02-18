export function parseCorsOrigins(value: string | undefined): string | string[] {
  if (!value) {
    throw new Error('FRONTEND_URL environment variable is required');
  }

  if (value.includes(',')) {
    return value.split(',').map((url) => url.trim());
  }

  return value;
}
