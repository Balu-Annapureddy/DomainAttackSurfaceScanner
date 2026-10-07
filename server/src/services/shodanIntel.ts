import net from 'node:net';
import { fetchProviderJson } from './providerHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface ShodanHostData {
  ip: string;
  ports: number[];
  cpes: string[];
  hostnames: string[];
  vulns: string[];
  tags: string[];
  available: boolean;
  hasData: boolean;
  reason?: string;
}

export interface ShodanIntelOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

// ── In-memory Shodan cache (TTL: 4 hours) ────────────────────────────────────
interface CacheEntry {
  data: ShodanHostData;
  expiresAt: number;
}

const shodanCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function clearShodanCache(): void {
  shodanCache.clear();
}

/**
 * Query Shodan InternetDB (https://internetdb.shodan.io/{ip})
 * Free, keyless, read-only passive lookup against pre-existing scan records.
 */
export async function queryShodanHost(
  ip: string,
  options: ShodanIntelOptions = {},
): Promise<ShodanHostData> {
  const now = Date.now();
  const cached = shodanCache.get(ip);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (options.budget && options.budget.remaining() <= 0) {
    return {
      ip,
      ports: [],
      cpes: [],
      hostnames: [],
      vulns: [],
      tags: [],
      available: false,
      hasData: false,
      reason: 'Scan request budget exhausted',
    };
  }

  const url = `https://internetdb.shodan.io/${encodeURIComponent(ip)}`;

  try {
    const raw = await fetchProviderJson<Record<string, unknown>>(url, {
      signal: options.signal,
      budget: options.budget,
      timeoutMs: 5000,
    });

    const hostData: ShodanHostData = {
      ip,
      ports: Array.isArray(raw.ports) ? raw.ports.filter((p): p is number => typeof p === 'number') : [],
      cpes: Array.isArray(raw.cpes) ? raw.cpes.filter((c): c is string => typeof c === 'string') : [],
      hostnames: Array.isArray(raw.hostnames) ? raw.hostnames.filter((h): h is string => typeof h === 'string') : [],
      vulns: Array.isArray(raw.vulns) ? raw.vulns.filter((v): v is string => typeof v === 'string') : [],
      tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
      available: true,
      hasData: true,
    };

    shodanCache.set(ip, { data: hostData, expiresAt: now + CACHE_TTL_MS });
    return hostData;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Shodan returns 404 when an IP has no scanned records in the database.
    // This is normal "no data", not an infrastructure or scan error.
    if (msg.includes('404')) {
      const noData: ShodanHostData = {
        ip,
        ports: [],
        cpes: [],
        hostnames: [],
        vulns: [],
        tags: [],
        available: true,
        hasData: false,
      };
      shodanCache.set(ip, { data: noData, expiresAt: now + CACHE_TTL_MS });
      return noData;
    }

    const failedData: ShodanHostData = {
      ip,
      ports: [],
      cpes: [],
      hostnames: [],
      vulns: [],
      tags: [],
      available: false,
      hasData: false,
      reason: msg,
    };
    return failedData;
  }
}

/**
 * Query Shodan InternetDB for multiple IP addresses.
 * Caps lookup to at most 5 unique public IPs to preserve scan budget.
 */
export async function runShodanIntel(
  addresses: string[],
  options: ShodanIntelOptions = {},
): Promise<ShodanHostData[]> {
  const uniqueIps = [
    ...new Set(
      addresses.filter(
        (ip): ip is string => typeof ip === 'string' && ip.trim().length > 0 && net.isIP(ip.trim()) > 0,
      ),
    ),
  ].slice(0, 5); // cap to at most 5 IPs per scan to protect budget

  const results: ShodanHostData[] = [];

  for (const ip of uniqueIps) {
    if (options.budget && options.budget.remaining() <= 0) {
      break;
    }
    const data = await queryShodanHost(ip, options);
    results.push(data);
  }

  return results;
}
