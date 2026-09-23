const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
] as const;

async function fetchResponse(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'DomainAttackSurfaceScanner/1.0',
      },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      url,
      status: response.status,
      redirected: response.type === 'opaqueredirect',
      location: response.headers.get('location') ?? null,
      headers,
      server: headers.server ?? null,
      poweredBy: headers['x-powered-by'] ?? null,
      missingSecurityHeaders: SECURITY_HEADERS.filter((header) => !(header in headers)),
      presentSecurityHeaders: SECURITY_HEADERS.filter((header) => header in headers),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runHttpFingerprint(domain: string): Promise<{ http: Awaited<ReturnType<typeof fetchResponse>> | null; https: Awaited<ReturnType<typeof fetchResponse>> | null; redirectChain: string[]; httpsEnforced: boolean; worryingHeaders: string[]; }> {
  const httpResult = await fetchResponse(`http://${domain}/`).catch(() => null);
  const httpsResult = await fetchResponse(`https://${domain}/`).catch(() => null);

  const redirectChain = [
    `http://${domain}/`,
    ...(httpResult?.location ? [httpResult.location] : []),
  ];

  const httpsEnforced = Boolean(
    httpResult && httpResult.location && /^https:/i.test(httpResult.location)
  ) || Boolean(httpsResult && httpsResult.status >= 200 && httpsResult.status < 400);

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
