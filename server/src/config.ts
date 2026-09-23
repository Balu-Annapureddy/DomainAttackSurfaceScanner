import dotenv from 'dotenv';
dotenv.config();

const PLACEHOLDER_PASSWORDS = new Set([
  '',
  'changeme123',
  'CHANGE_ME_BEFORE_DEPLOY',
  'change_me',
  'change-me',
  'password',
]);

function requiredString(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value?.trim()) throw new Error(`[config] ${name} must not be empty.`);
  return value.trim();
}

function integer(name: string, fallback: string, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`[config] ${name} must be an integer >= ${minimum}.`);
  }
  return value;
}

function boolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (value !== 'true' && value !== 'false') {
    throw new Error(`[config] ${name} must be either "true" or "false".`);
  }
  return value === 'true';
}

function validateConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('[config] NODE_ENV must be development, test, or production.');
  }

  const adminPassword = requiredString('ADMIN_PASSWORD', 'CHANGE_ME_BEFORE_DEPLOY');
  if (nodeEnv === 'production' && PLACEHOLDER_PASSWORDS.has(adminPassword)) {
    const message = '[config] Refusing to start in production: ADMIN_PASSWORD is missing or still a known placeholder. Set a unique secret before deployment.';
    console.error(message);
    throw new Error(message);
  }

  const clientOrigin = requiredString('CLIENT_ORIGIN', 'http://localhost:5173');
  try {
    new URL(clientOrigin);
  } catch {
    throw new Error('[config] CLIENT_ORIGIN must be a valid absolute URL.');
  }

  const geoProviderUrl = requiredString('GEO_PROVIDER_URL', 'https://ipapi.co/{ip}/json/');
  if (!geoProviderUrl.includes('{ip}')) {
    throw new Error('[config] GEO_PROVIDER_URL must contain the {ip} placeholder.');
  }

  return {
    port: integer('PORT', '3001', 1),
    nodeEnv,
    isDev: nodeEnv === 'development',
    clientOrigin,
    adminUsername: requiredString('ADMIN_USERNAME', 'admin'),
    adminPassword,
    maxFileSizeMb: integer('MAX_FILE_SIZE_MB', '50', 1),
    uploadDir: requiredString('UPLOAD_DIR', './uploads'),
    enableShortDurations: boolean('ENABLE_SHORT_DURATIONS', true),
    cleanupIntervalMs: integer('CLEANUP_INTERVAL_MS', '60000', 1000),
    geoEnabled: boolean('GEO_ENABLED', true),
    geoProviderUrl,
    geoApiKey: process.env.GEO_API_KEY || '',
    geoTimeoutMs: integer('GEO_TIMEOUT_MS', '3000', 100),
  };
}

export const config = {
  ...validateConfig(),

  allowedMimeTypes: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    pdf: ['application/pdf'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  },

};
