export default () => ({
  database: {
    url: process.env.DATABASE_URL,
    type: process.env.DB_TYPE || 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
  },
});
