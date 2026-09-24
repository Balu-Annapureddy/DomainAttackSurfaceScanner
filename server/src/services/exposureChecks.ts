import { safeGet } from './safeHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface ExposureChecksOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

async function checkUrl(
  url: string,
  options: ExposureChecksOptions,
): Promise<{ url: string; status: number; ok: boolean }> {
  const response = await safeGet(url, options);
  return { url, status: response.status, ok: response.status === 200 };
}

export async function runExposureChecks(
  domain: string,
  options: ExposureChecksOptions = {},
): Promise<{ checks: Array<{ path: string; status: number; present: boolean }>; discovered: number }> {
  if (options.signal?.aborted) {
    return { checks: [], discovered: 0 };
  }

  const paths = ['/robots.txt', '/sitemap.xml', '/.well-known/security.txt'];
  const checks = await Promise.all(
    paths.map(async (path) => {
      const url = `https://${domain}${path}`;
      if (options.budget && options.budget.remaining() <= 0) {
        return { path, status: 0, present: false };
      }
      const result = await checkUrl(url, options).catch(() => ({
        url,
        status: 0,
        ok: false,
      }));
      return {
        path,
        status: result.status,
        present: result.ok,
      };
    }),
  );

  return {
    checks,
    discovered: checks.filter((entry) => entry.present).length,
  };
}
