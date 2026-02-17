export const validateEnvSecret = (
  name: string,
  value: string | undefined,
  minLength = 32,
): string => {
  if (!value) {
    throw new Error(`${name} environment variable is not defined`);
  }
  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters long`);
  }
  return value;
};
