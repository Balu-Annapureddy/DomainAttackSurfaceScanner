import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),

  uploadDir: process.env.UPLOAD_DIR || './uploads',

  enableShortDurations: process.env.ENABLE_SHORT_DURATIONS === 'true',

  cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '60000', 10),

  allowedMimeTypes: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    pdf: ['application/pdf'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  },

  // IP Geolocation provider (ipapi.co by default — free tier, no key required)
  geoEnabled: process.env.GEO_ENABLED !== 'false',
  geoProviderUrl: process.env.GEO_PROVIDER_URL || 'https://ipapi.co/{ip}/json/',
  geoApiKey: process.env.GEO_API_KEY || '',
  geoTimeoutMs: parseInt(process.env.GEO_TIMEOUT_MS || '3000', 10),
};
