import { validateEnvSecret } from '../common/utils/validate-env.util';

export default () => {
  const jwtSecret = validateEnvSecret('JWT_SECRET', process.env.JWT_SECRET);
  const jwtRefreshSecret = validateEnvSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
  );

  return {
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
      refreshSecret: jwtRefreshSecret,
      refreshExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
    },
  };
};
