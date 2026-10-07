import { fetchProviderJson } from './providerHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface BreachSummary {
  name: string;
  title: string;
  breachDate: string;
  pwnCount: number;
  dataClasses: string[];
}

export interface BreachExposureResult {
  domain: string;
  breaches: BreachSummary[];
  totalPwnCount: number;
}

export interface BreachExposureOptions {
  budget?: ScanRequestBudget;
  signal?: AbortSignal;
}

interface HibpBreachRecord {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  PwnCount: number;
  DataClasses: string[];
  IsFabricated?: boolean;
  IsRetired?: boolean;
}

// In-memory cache for the global public breach directory to avoid repeated downloads
let breachCache: HibpBreachRecord[] | null = null;
let breachCacheExpiresAt = 0;

export function resetBreachCache(): void {
  breachCache = null;
  breachCacheExpiresAt = 0;
}

/**
 * Queries public breach disclosure presence via HaveIBeenPwned's public keyless breach list.
 *
 * SCOPE BOUNDARY COMPLIANCE:
 * - Returns ONLY breach metadata: name, title, date, account count, and exposed data class names.
 * - NEVER requests, processes, stores, or displays raw credentials, passwords, hashes, or employee personal data.
 */
export async function checkBreachExposure(
  domain: string,
  options: BreachExposureOptions = {},
): Promise<BreachExposureResult | null> {
  const cleanDomain = domain?.trim().toLowerCase();
  if (!cleanDomain) return null;

  try {
    const now = Date.now();
    let records = breachCache;

    if (!records || now > breachCacheExpiresAt) {
      const url = 'https://haveibeenpwned.com/api/v3/breaches';
      const fetched = await fetchProviderJson<HibpBreachRecord[]>(url, {
        budget: options.budget,
        signal: options.signal,
        timeoutMs: 5000,
      });

      if (Array.isArray(fetched)) {
        records = fetched;
        breachCache = fetched;
        breachCacheExpiresAt = now + 6 * 60 * 60 * 1000; // 6-hour cache
      }
    }

    if (!records || records.length === 0) {
      return null;
    }

    const matching = records.filter((r) => {
      const bDomain = (r.Domain || '').toLowerCase();
      return bDomain === cleanDomain || (cleanDomain.endsWith(`.${bDomain}`) && bDomain.length > 3);
    });

    const breaches: BreachSummary[] = matching.map((b) => ({
      name: b.Name,
      title: b.Title,
      breachDate: b.BreachDate,
      pwnCount: b.PwnCount || 0,
      dataClasses: Array.isArray(b.DataClasses) ? b.DataClasses : [],
    }));

    const totalPwnCount = breaches.reduce((sum, b) => sum + b.pwnCount, 0);

    return {
      domain: cleanDomain,
      breaches,
      totalPwnCount,
    };
  } catch {
    // If HIBP is temporarily unreachable or blocked, return null gracefully
    return null;
  }
}
