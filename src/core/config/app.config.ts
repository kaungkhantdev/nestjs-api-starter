export default () => ({
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'API',
  url: process.env.APP_URL || 'http://localhost:3000',
});
