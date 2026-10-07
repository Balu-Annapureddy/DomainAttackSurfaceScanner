import { fetchProviderJson } from './providerHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface DisclosedCve {
  cveId: string;
  cpe: string;
  description: string;
  publishedDate: string;
  severity: 'high' | 'medium' | 'low';
}

export interface CveLookupOptions {
  budget?: ScanRequestBudget;
  signal?: AbortSignal;
}

interface NvdResponse {
  vulnerabilities?: Array<{
    cve: {
      id: string;
      published?: string;
      descriptions?: Array<{ lang: string; value: string }>;
      metrics?: {
        cvssMetricV31?: Array<{
          cvssData?: {
            baseSeverity?: string;
            baseScore?: number;
          };
        }>;
        cvssMetricV30?: Array<{
          cvssData?: {
            baseSeverity?: string;
            baseScore?: number;
          };
        }>;
      };
    };
  }>;
}

// In-memory cache for recent CPE queries to respect NVD rate limits
const cveCache = new Map<string, { data: DisclosedCve[]; expiresAt: number }>();

/**
 * Looks up recently disclosed CVEs matching identified software CPEs via the National Vulnerability Database (NVD) API 2.0.
 */
export async function lookupRecentCves(
  cpes: string[],
  options: CveLookupOptions = {},
): Promise<DisclosedCve[]> {
  if (!Array.isArray(cpes) || cpes.length === 0) return [];

  const uniqueCpes = Array.from(new Set(cpes.map((c) => c.trim()).filter(Boolean))).slice(0, 3);
  const results: DisclosedCve[] = [];
  const now = Date.now();

  for (const cpe of uniqueCpes) {
    const cached = cveCache.get(cpe);
    if (cached && cached.expiresAt > now) {
      results.push(...cached.data);
      continue;
    }

    try {
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(cpe)}&resultsPerPage=5`;
      const res = await fetchProviderJson<NvdResponse>(url, {
        budget: options.budget,
        signal: options.signal,
        timeoutMs: 4000,
      });

      const items = res?.vulnerabilities ?? [];
      const cvesForCpe: DisclosedCve[] = items.map((item) => {
        const cve = item.cve;
        const desc = cve.descriptions?.find((d) => d.lang === 'en')?.value ?? 'Publicly documented vulnerability.';
        const cvss = cve.metrics?.cvssMetricV31?.[0]?.cvssData ?? cve.metrics?.cvssMetricV30?.[0]?.cvssData;
        const rawSeverity = (cvss?.baseSeverity || '').toLowerCase();
        const severity: 'high' | 'medium' | 'low' =
          rawSeverity === 'critical' || rawSeverity === 'high'
            ? 'high'
            : rawSeverity === 'medium'
            ? 'medium'
            : 'low';

        return {
          cveId: cve.id,
          cpe,
          description: desc,
          publishedDate: cve.published || new Date().toISOString(),
          severity,
        };
      });

      cveCache.set(cpe, { data: cvesForCpe, expiresAt: now + 3600 * 1000 });
      results.push(...cvesForCpe);
    } catch {
      // Continue gracefully if NVD is rate-limiting or timing out
    }
  }

  return results;
}
