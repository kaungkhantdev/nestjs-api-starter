export default () => ({
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3',
    maxFileSize:
      parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024 ||
      10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ],
    s3: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_S3_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_S3_KEY,
      bucket: process.env.AWS_S3_BUCKET,
    },
    local: {
      path: process.env.LOCAL_STORAGE_PATH || './uploads',
    },
  },
});
