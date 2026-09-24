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

function optionalInteger(name: string, fallback: string, minimum: number): number {
  return integer(name, fallback, minimum);
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
  const ipIntelligenceUrl = requiredString('IP_INTELLIGENCE_URL', 'https://ipapi.co/{ip}/json/');
  if (!ipIntelligenceUrl.includes('{ip}')) {
    throw new Error('[config] IP_INTELLIGENCE_URL must contain the {ip} placeholder.');
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
    scanTimeoutMs: optionalInteger('SCAN_TIMEOUT_MS', '120000', 1000),
    maxConcurrentScans: optionalInteger('MAX_CONCURRENT_SCANS', '2', 1),
    maxSubdomains: optionalInteger('MAX_SUBDOMAINS', '200', 1),
    maxAssets: optionalInteger('MAX_ASSETS', '500', 1),
    maxResponseBytes: optionalInteger('MAX_RESPONSE_BYTES', '524288', 1024),
    maxRedirects: optionalInteger('MAX_REDIRECTS', '3', 0),
    maxExternalRequests: optionalInteger('MAX_EXTERNAL_REQUESTS', '30', 1),
    ipIntelligenceEnabled: process.env.IP_INTELLIGENCE_ENABLED !== 'false',
    ipIntelligenceUrl,
    ipIntelligenceTimeoutMs: optionalInteger('IP_INTELLIGENCE_TIMEOUT_MS', '5000', 100),
  };
}

export const config = validateConfig();
