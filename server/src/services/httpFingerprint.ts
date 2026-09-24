import { safeGet, type SafeHttpResponse } from './safeHttp';
import type { ScanRequestBudget } from './scanBudget';

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
] as const;

export type HttpObservation = SafeHttpResponse & {
  server: string | null;
  poweredBy: string | null;
  contentType: string | null;
  missingSecurityHeaders: string[];
  presentSecurityHeaders: string[];
  technologyEvidence: Array<{ name: string; confidence: 'low' | 'medium'; evidence: string }>;
};

export interface HttpFingerprintResult {
  http: HttpObservation | null;
  https: HttpObservation | null;
  redirectChain: string[];
  httpsEnforced: boolean;
  httpAvailable: boolean;
  httpsAvailable: boolean;
  httpRedirectsToHttps: boolean;
  canonicalUrl: string | null;
  worryingHeaders: string[];
}

export interface HttpFingerprintOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

export async function runHttpFingerprint(
  domain: string,
  options: HttpFingerprintOptions = {},
): Promise<HttpFingerprintResult> {
  const httpResult = await safeGet(`http://${domain}/`, options).then((response): HttpObservation => ({
    ...response,
    server: response.headers.server ?? null,
    poweredBy: response.headers['x-powered-by'] ?? null,
    contentType: response.headers['content-type'] ?? null,
    missingSecurityHeaders: SECURITY_HEADERS.filter((header) => !(header in response.headers)),
    presentSecurityHeaders: SECURITY_HEADERS.filter((header) => header in response.headers),
    technologyEvidence: detectTechnology(response.body, response.headers),
  })).catch(() => null);

  const httpsResult = await safeGet(`https://${domain}/`, options).then((response): HttpObservation => ({
    ...response,
    server: response.headers.server ?? null,
    poweredBy: response.headers['x-powered-by'] ?? null,
    contentType: response.headers['content-type'] ?? null,
    missingSecurityHeaders: SECURITY_HEADERS.filter((header) => !(header in response.headers)),
    presentSecurityHeaders: SECURITY_HEADERS.filter((header) => header in response.headers),
    technologyEvidence: detectTechnology(response.body, response.headers),
  })).catch(() => null);

  const httpAvailable = Boolean(httpResult && httpResult.status > 0);
  const httpsAvailable = Boolean(httpsResult && httpsResult.status > 0);

  // HTTPS is enforced ONLY if HTTP traffic is redirected to HTTPS (directly or through chain)
  const httpRedirectsToHttps = Boolean(
    httpResult && (
      httpResult.url.startsWith('https:') ||
      httpResult.redirectChain.slice(1).some((url) => url.startsWith('https:'))
    ),
  );

  // If HTTP responds with 200 without redirecting to HTTPS, HTTPS is NOT enforced
  // If HTTP is completely down or unavailable, there is insufficient evidence of enforcement
  const httpsEnforced = httpAvailable ? httpRedirectsToHttps : false;

  const redirectChain = [
    `http://${domain}/`,
    ...(httpResult?.redirectChain.slice(1) ?? []),
  ];

  const canonicalUrl = httpsResult?.url ?? httpResult?.url ?? null;

  const worryingHeaders = Array.from(new Set([
    ...(httpResult?.missingSecurityHeaders ?? []),
    ...(httpsResult?.missingSecurityHeaders ?? []),
  ]));

  return {
    http: httpResult,
    https: httpsResult,
    redirectChain,
    httpsEnforced,
    httpAvailable,
    httpsAvailable,
    httpRedirectsToHttps,
    canonicalUrl,
    worryingHeaders,
  };
}

function detectTechnology(
  body: string,
  headers: Record<string, string>,
): Array<{ name: string; confidence: 'low' | 'medium'; evidence: string }> {
  const evidence: Array<{ name: string; confidence: 'low' | 'medium'; evidence: string }> = [];
  const generator = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1];
  if (generator) {
    evidence.push({ name: generator, confidence: 'medium', evidence: 'Observed HTML generator meta tag' });
  }
  if (headers['x-powered-by']) {
    evidence.push({ name: headers['x-powered-by'], confidence: 'medium', evidence: 'Observed X-Powered-By response header' });
  }
  if (/\/wp-content\/|wp-includes\//i.test(body)) {
    evidence.push({ name: 'WordPress', confidence: 'medium', evidence: 'Observed WordPress path signature in HTML' });
  }
  return evidence;
}
