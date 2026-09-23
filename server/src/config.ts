import dotenv from 'dotenv';
dotenv.config();

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

function validateConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('[config] NODE_ENV must be development, test, or production.');
  }

  const clientOrigin = requiredString('CLIENT_ORIGIN', 'http://localhost:5173');
  try {
    new URL(clientOrigin);
  } catch {
    throw new Error('[config] CLIENT_ORIGIN must be a valid absolute URL.');
  }

  const scanRateLimitDefaults = nodeEnv === 'production'
    ? { max: '10', windowMs: '3600000' }
    : { max: '100', windowMs: '900000' };

  return {
    port: integer('PORT', '3001', 1),
    nodeEnv,
    isDev: nodeEnv === 'development',
    clientOrigin,
    scanRateLimitMax: integer('SCAN_RATE_LIMIT_MAX', scanRateLimitDefaults.max, 1),
    scanRateLimitWindowMs: integer('SCAN_RATE_LIMIT_WINDOW_MS', scanRateLimitDefaults.windowMs, 1),
  };
}

export const config = validateConfig();
