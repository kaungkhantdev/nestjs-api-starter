import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import storageConfig from './storage.config';

export default () => ({
  ...appConfig(),
  ...databaseConfig(),
  ...jwtConfig(),
  ...storageConfig(),
});
