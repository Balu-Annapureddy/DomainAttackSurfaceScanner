async function checkUrl(url: string): Promise<{ url: string; status: number; ok: boolean; }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'user-agent': 'DomainAttackSurfaceScanner/1.0' },
    });

    return {
      url,
      status: response.status,
      ok: response.status === 200,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runExposureChecks(domain: string): Promise<{ checks: Array<{ path: string; status: number; present: boolean; }>; discovered: number; }> {
  const paths = ['/robots.txt', '/sitemap.xml', '/.well-known/security.txt'];
  const checks = await Promise.all(paths.map(async (path) => {
    const result = await checkUrl(`https://${domain}${path}`).catch(() => ({ url: `https://${domain}${path}`, status: 0, ok: false }));
    return {
      path,
      status: result.status,
      present: result.ok,
    };
  }));

  return {
    checks,
    discovered: checks.filter((entry) => entry.present).length,
  };
}
