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
  let parsedIpProviderUrl: URL;
  try {
    parsedIpProviderUrl = new URL(ipIntelligenceUrl.replace('{ip}', '1.1.1.1'));
  } catch {
    throw new Error('[config] IP_INTELLIGENCE_URL must be a valid absolute URL.');
  }
  if (parsedIpProviderUrl.protocol !== 'https:') {
    throw new Error('[config] IP_INTELLIGENCE_URL must use the HTTPS protocol.');
  }
  const defaultAllowedHosts = ['ipapi.co', 'ip-api.com', 'ipwhois.app', 'ipinfo.io'];
  const customAllowedHosts = process.env.ALLOWED_IP_INTELLIGENCE_HOSTS?.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean) ?? [];
  const allowedProviderHosts = new Set([...defaultAllowedHosts, ...customAllowedHosts]);
  if (!allowedProviderHosts.has(parsedIpProviderUrl.hostname.toLowerCase())) {
    throw new Error(`[config] IP_INTELLIGENCE_URL hostname "${parsedIpProviderUrl.hostname}" is not in the allowed providers list.`);
  }

  const sessionSecret = process.env.SESSION_SECRET?.trim() || (nodeEnv !== 'production' ? 'dass_dev_session_secret_local_testing_only' : '');
  if (nodeEnv === 'production') {
    if (!sessionSecret || sessionSecret === 'dass_dev_session_secret_local_testing_only' || sessionSecret === 'dass_production_ready_session_key_secret_2026' || sessionSecret.length < 32) {
      throw new Error('[config] In production, SESSION_SECRET must be set to a dedicated high-entropy secret (>= 32 characters).');
    }
    const originUrl = new URL(clientOrigin);
    if (['localhost', '127.0.0.1', '::1'].includes(originUrl.hostname.toLowerCase())) {
      throw new Error(`[config] In production, CLIENT_ORIGIN cannot be localhost or loopback ("${clientOrigin}").`);
    }
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
      throw new Error('[config] DATABASE_URL must start with postgres:// or postgresql://');
    }
  } else if (nodeEnv === 'production' && process.env.REQUIRE_POSTGRES === 'true') {
    throw new Error('[config] In production with REQUIRE_POSTGRES=true, DATABASE_URL must be provided.');
  }

  const trustProxyEnv = process.env.TRUST_PROXY?.trim();
  const trustProxy = trustProxyEnv
    ? (/^\d+$/.test(trustProxyEnv) ? Number(trustProxyEnv) : trustProxyEnv === 'true' ? true : trustProxyEnv === 'false' ? false : trustProxyEnv)
    : (nodeEnv === 'production' ? 1 : false);

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
    databaseUrl: process.env.DATABASE_URL?.trim(),
    sessionSecret,
    trustProxy,
    anonymousScanLimit: optionalInteger('ANONYMOUS_SCAN_LIMIT', '5', 1),
    registeredScanLimit: optionalInteger('REGISTERED_SCAN_LIMIT', '50', 1),
    scanLimitWindowMs: optionalInteger('SCAN_LIMIT_WINDOW_MS', '3600000', 1000), // 1 hour default
  };
}

export const config = validateConfig();
