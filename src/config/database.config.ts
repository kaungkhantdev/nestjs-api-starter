import { validateEnvSecret } from '@/common/utils/validate-env.util';

export default () => {
  const databaseUrl = validateEnvSecret(
    'DATABASE_URL',
    process.env.DATABASE_URL,
  );
  return {
    database: {
      url: databaseUrl,
    },
  };
};
