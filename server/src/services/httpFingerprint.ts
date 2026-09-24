const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
] as const;
import { safeGet } from './safeHttp';

type HttpObservation = Awaited<ReturnType<typeof safeGet>> & {
  server: string | null;
  poweredBy: string | null;
  contentType: string | null;
  missingSecurityHeaders: string[];
  presentSecurityHeaders: string[];
  technologyEvidence: Array<{ name: string; confidence: 'low' | 'medium'; evidence: string }>;
};

export async function runHttpFingerprint(domain: string): Promise<{ http: HttpObservation | null; https: HttpObservation | null; redirectChain: string[]; httpsEnforced: boolean; worryingHeaders: string[]; }> {
  const httpResult = await safeGet(`http://${domain}/`).then((response): HttpObservation => ({
    ...response,
    server: response.headers.server ?? null,
    poweredBy: response.headers['x-powered-by'] ?? null,
    contentType: response.headers['content-type'] ?? null,
    missingSecurityHeaders: SECURITY_HEADERS.filter((header) => !(header in response.headers)),
    presentSecurityHeaders: SECURITY_HEADERS.filter((header) => header in response.headers),
    technologyEvidence: detectTechnology(response.body, response.headers),
  })).catch(() => null);
  const httpsResult = await safeGet(`https://${domain}/`).then((response): HttpObservation => ({
    ...response,
    server: response.headers.server ?? null,
    poweredBy: response.headers['x-powered-by'] ?? null,
    contentType: response.headers['content-type'] ?? null,
    missingSecurityHeaders: SECURITY_HEADERS.filter((header) => !(header in response.headers)),
    presentSecurityHeaders: SECURITY_HEADERS.filter((header) => header in response.headers),
    technologyEvidence: detectTechnology(response.body, response.headers),
  })).catch(() => null);

  const redirectChain = [
    `http://${domain}/`,
    ...(httpResult?.redirectChain.slice(1) ?? []),
  ];

  const httpsEnforced = Boolean(httpResult?.redirectChain.some((url) => url.startsWith('https:')))
    || Boolean(httpsResult && httpsResult.status >= 200 && httpsResult.status < 400);

  const worryingHeaders = Array.from(new Set([
    ...(httpResult?.missingSecurityHeaders ?? []),
    ...(httpsResult?.missingSecurityHeaders ?? []),
  ]));

  return {
    http: httpResult,
    https: httpsResult,
    redirectChain,
    httpsEnforced,
    worryingHeaders,
  };
}

function detectTechnology(body: string, headers: Record<string, string>): Array<{ name: string; confidence: 'low' | 'medium'; evidence: string; }> {
  const evidence: Array<{ name: string; confidence: 'low' | 'medium'; evidence: string; }> = [];
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
