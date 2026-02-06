export default () => ({
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3', // s3, gcs, azure, local
    s3: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_S3_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_S3_KEY,
      bucket: process.env.AWS_S3_BUCKET,
    },
    // Future providers can be added here:
    // gcs: { ... },
    // azure: { ... },
  },
});
