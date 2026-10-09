import { safeGet, type SafeHttpResponse } from './safeHttp';
import type { ScanRequestBudget } from './scanBudget';

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
] as const;

export type NetworkCheckOutcome = 'completed' | 'confirmed_absent' | 'inconclusive';

export interface CookieObservation {
  name: string;
  hasSecure: boolean;
  hasHttpOnly: boolean;
  sameSite: 'Strict' | 'Lax' | 'None' | null;
  isSessionLikely: boolean;
  missingFlags: string[];
}

export type HttpObservation = SafeHttpResponse & {
  server: string | null;
  poweredBy: string | null;
  contentType: string | null;
  missingSecurityHeaders: string[];
  presentSecurityHeaders: string[];
  technologyEvidence: Array<{ name: string; confidence: 'low' | 'medium'; evidence: string }>;
  cookies: CookieObservation[];
  corsMisconfiguration: boolean;
};

export interface HttpFingerprintResult {
  http: HttpObservation | null;
  https: HttpObservation | null;
  redirectChain: string[];
  httpsEnforced: boolean | undefined;
  httpAvailable: boolean;
  httpsAvailable: boolean;
  httpOutcome: NetworkCheckOutcome;
  httpsOutcome: NetworkCheckOutcome;
  httpRedirectsToHttps: boolean;
  finalObservedUrl: string | null;
  worryingHeaders: string[];
  cookies: CookieObservation[];
  corsMisconfiguration: boolean;
}

export interface HttpFingerprintOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

export function parseCookieHeader(rawCookies: string[] = []): CookieObservation[] {
  const SESSION_NAME_REGEX = /session|auth|token|sid|jwt|connect\.sid|phpsessid|jsessionid|aspnet_sessionid/i;
  const observations: CookieObservation[] = [];

  for (const cookieStr of rawCookies) {
    if (!cookieStr || typeof cookieStr !== 'string') continue;
    const parts = cookieStr.split(';').map((p) => p.trim());
    const namePart = parts[0];
    if (!namePart) continue;
    const eqIdx = namePart.indexOf('=');
    const name = eqIdx > -1 ? namePart.slice(0, eqIdx).trim() : namePart.trim();
    if (!name) continue;

    const hasSecure = parts.some((p) => /^secure$/i.test(p));
    const hasHttpOnly = parts.some((p) => /^httponly$/i.test(p));
    let sameSite: 'Strict' | 'Lax' | 'None' | null = null;
    const sameSitePart = parts.find((p) => /^samesite=/i.test(p));
    if (sameSitePart) {
      const val = sameSitePart.split('=')[1]?.trim().toLowerCase();
      if (val === 'strict') sameSite = 'Strict';
      else if (val === 'lax') sameSite = 'Lax';
      else if (val === 'none') sameSite = 'None';
    }

    const isSessionLikely = SESSION_NAME_REGEX.test(name);
    const missingFlags: string[] = [];
    if (!hasSecure) missingFlags.push('Secure');
    if (!hasHttpOnly) missingFlags.push('HttpOnly');
    if (!sameSite) missingFlags.push('SameSite');

    observations.push({
      name,
      hasSecure,
      hasHttpOnly,
      sameSite,
      isSessionLikely,
      missingFlags,
    });
  }

  return observations;
}

export function checkCorsMisconfiguration(headers: Record<string, string>): boolean {
  const origin = (headers['access-control-allow-origin'] || '').trim().toLowerCase();
  const credentials = (headers['access-control-allow-credentials'] || '').trim().toLowerCase();
  return origin === '*' && credentials === 'true';
}

export async function runHttpFingerprint(
  domain: string,
  options: HttpFingerprintOptions = {},
): Promise<HttpFingerprintResult> {
  let httpResult: HttpObservation | null = null;
  let httpOutcome: NetworkCheckOutcome = 'inconclusive';

  try {
    const response = await safeGet(`http://${domain}/`, options);
    const rawCookies = response.setCookies && response.setCookies.length > 0
      ? response.setCookies
      : response.headers['set-cookie']
      ? [response.headers['set-cookie']]
      : [];
    httpResult = {
      ...response,
      server: response.headers.server ?? null,
      poweredBy: response.headers['x-powered-by'] ?? null,
      contentType: response.headers['content-type'] ?? null,
      missingSecurityHeaders: SECURITY_HEADERS.filter((header) => !(header in response.headers)),
      presentSecurityHeaders: SECURITY_HEADERS.filter((header) => header in response.headers),
      technologyEvidence: detectTechnology(response.body, response.headers),
      cookies: parseCookieHeader(rawCookies),
      corsMisconfiguration: checkCorsMisconfiguration(response.headers),
    };
    httpOutcome = 'completed';
  } catch (err: any) {
    const isRefused = err?.code === 'ECONNREFUSED' || String(err?.message).includes('ECONNREFUSED');
    httpOutcome = isRefused ? 'confirmed_absent' : 'inconclusive';
  }

  let httpsResult: HttpObservation | null = null;
  let httpsOutcome: NetworkCheckOutcome = 'inconclusive';

  try {
    const response = await safeGet(`https://${domain}/`, options);
    const rawCookies = response.setCookies && response.setCookies.length > 0
      ? response.setCookies
      : response.headers['set-cookie']
      ? [response.headers['set-cookie']]
      : [];
    httpsResult = {
      ...response,
      server: response.headers.server ?? null,
      poweredBy: response.headers['x-powered-by'] ?? null,
      contentType: response.headers['content-type'] ?? null,
      missingSecurityHeaders: SECURITY_HEADERS.filter((header) => !(header in response.headers)),
      presentSecurityHeaders: SECURITY_HEADERS.filter((header) => header in response.headers),
      technologyEvidence: detectTechnology(response.body, response.headers),
      cookies: parseCookieHeader(rawCookies),
      corsMisconfiguration: checkCorsMisconfiguration(response.headers),
    };
    httpsOutcome = 'completed';
  } catch (err: any) {
    const isRefused = err?.code === 'ECONNREFUSED' || String(err?.message).includes('ECONNREFUSED');
    httpsOutcome = isRefused ? 'confirmed_absent' : 'inconclusive';
  }

  const httpAvailable = Boolean(httpResult && httpResult.status > 0);
  const httpsAvailable = Boolean(httpsResult && httpsResult.status > 0);

  // HTTPS is enforced ONLY if HTTP traffic is redirected to HTTPS (directly or through chain)
  const httpRedirectsToHttps = Boolean(
    httpResult && (
      httpResult.url.startsWith('https:') ||
      httpResult.redirectChain.slice(1).some((url) => url.startsWith('https:'))
    ),
  );

  // If HTTP responds, httpsEnforced depends on redirection.
  // If HTTP actively refused connection (closed port 80), plaintext HTTP is not exposed.
  // If HTTP check failed with timeout or network error, enforcement is INCONCLUSIVE (undefined),
  // NEVER assumed to be false.
  const httpsEnforced: boolean | undefined = httpAvailable
    ? httpRedirectsToHttps
    : httpOutcome === 'confirmed_absent'
    ? true
    : undefined;

  const redirectChain = [
    `http://${domain}/`,
    ...(httpResult?.redirectChain.slice(1) ?? []),
  ];

  const finalObservedUrl = httpsResult?.url ?? httpResult?.url ?? null;

  const worryingHeaders = Array.from(new Set([
    ...(httpResult?.missingSecurityHeaders ?? []),
    ...(httpsResult?.missingSecurityHeaders ?? []),
  ]));

  const cookies = [
    ...(httpsResult?.cookies ?? []),
    ...(httpResult?.cookies ?? []),
  ];

  const corsMisconfiguration = Boolean(
    httpsResult?.corsMisconfiguration || httpResult?.corsMisconfiguration,
  );

  return {
    http: httpResult,
    https: httpsResult,
    redirectChain,
    httpsEnforced,
    httpAvailable,
    httpsAvailable,
    httpOutcome,
    httpsOutcome,
    httpRedirectsToHttps,
    finalObservedUrl,
    worryingHeaders,
    cookies,
    corsMisconfiguration,
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
