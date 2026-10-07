import net from 'node:net';
import { config } from '../config';
import { fetchProviderJson } from './providerHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface IpIntelligence {
  ip: string;
  version: 4 | 6;
  asn?: string;
  organization?: string;
  network?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  reverseDns?: string;
  anycastLikely?: boolean;
  approximate: true;
  available: boolean;
  reason?: string;
}

export interface IpIntelligenceOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

// ── In-memory IP cache (TTL: 4 hours) ────────────────────────────────────────
interface CacheEntry {
  data: IpIntelligence;
  expiresAt: number;
}

const ipIntelligenceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function clearIpIntelligenceCache(): void {
  ipIntelligenceCache.clear();
}

// Known anycast CDN and cloud providers
const ANYCAST_INDICATORS = [
  'cloudflare',
  'amazon',
  'aws',
  'google',
  'fastly',
  'akamai',
  'microsoft',
  'azure',
];

function checkAnycastLikely(org?: string, asn?: string): boolean {
  const combined = `${org ?? ''} ${asn ?? ''}`.toLowerCase();
  return ANYCAST_INDICATORS.some((indicator) => combined.includes(indicator));
}

async function queryPrimaryProvider(ip: string, options: IpIntelligenceOptions): Promise<Partial<IpIntelligence>> {
  const url = config.ipIntelligenceUrl.replace('{ip}', encodeURIComponent(ip));
  const data = await fetchProviderJson<Record<string, unknown>>(url, {
    signal: options.signal,
    budget: options.budget,
  });

  // ipapi.co returns 200 with { error: true, reason: '...', message: '...' } when rate-limited or invalid
  if (data && (data.error === true || data.error === 'true')) {
    const errorMsg = typeof data.reason === 'string'
      ? data.reason
      : typeof data.message === 'string'
      ? data.message
      : 'Primary IP intelligence provider error/rate-limit';
    throw new Error(errorMsg);
  }

  const asn = typeof data.asn === 'string' ? data.asn : undefined;
  const org = typeof data.org === 'string' ? data.org : undefined;

  return {
    asn,
    organization: org,
    network: typeof data.network === 'string' ? data.network : undefined,
    country: typeof data.country_name === 'string' ? data.country_name : undefined,
    region: typeof data.region === 'string' ? data.region : undefined,
    city: typeof data.city === 'string' ? data.city : undefined,
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    reverseDns: typeof data.hostname === 'string' ? data.hostname : undefined,
    anycastLikely: checkAnycastLikely(org, asn),
  };
}

async function queryFallbackProvider(ip: string, options: IpIntelligenceOptions): Promise<Partial<IpIntelligence>> {
  const fallbackUrl = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,lat,lon,as,org,isp,reverse`;
  const data = await fetchProviderJson<Record<string, unknown>>(fallbackUrl, {
    signal: options.signal,
    budget: options.budget,
  });

  if (data && data.status === 'fail') {
    throw new Error(typeof data.message === 'string' ? data.message : 'Fallback IP provider lookup failed');
  }

  const asn = typeof data.as === 'string' ? data.as : undefined;
  const org = typeof data.org === 'string' ? data.org : typeof data.isp === 'string' ? data.isp : undefined;

  return {
    asn,
    organization: org,
    country: typeof data.country === 'string' ? data.country : undefined,
    region: typeof data.regionName === 'string' ? data.regionName : undefined,
    city: typeof data.city === 'string' ? data.city : undefined,
    latitude: typeof data.lat === 'number' ? data.lat : undefined,
    longitude: typeof data.lon === 'number' ? data.lon : undefined,
    reverseDns: typeof data.reverse === 'string' ? data.reverse : undefined,
    anycastLikely: checkAnycastLikely(org, asn),
  };
}

export async function runIpIntelligence(
  addresses: string[],
  options: IpIntelligenceOptions = {},
): Promise<IpIntelligence[]> {
  if (!config.ipIntelligenceEnabled) {
    return [];
  }

  const results: IpIntelligence[] = [];
  const uniqueAddresses = [
    ...new Set(
      addresses.filter(
        (ip): ip is string => typeof ip === 'string' && ip.trim().length > 0 && net.isIP(ip.trim()) > 0,
      ),
    ),
  ];

  if (uniqueAddresses.length === 0) {
    return [];
  }

  const now = Date.now();

  for (const ip of uniqueAddresses) {
    // 1. Check cache first
    const cached = ipIntelligenceCache.get(ip);
    if (cached && cached.expiresAt > now) {
      results.push(cached.data);
      continue;
    }

    // 2. Check scan budget
    if (options.budget && options.budget.remaining() <= 0) {
      const budgetExhausted: IpIntelligence = {
        ip,
        version: ip.includes(':') ? 6 : 4,
        approximate: true,
        available: false,
        reason: 'Scan request budget exhausted',
      };
      results.push(budgetExhausted);
      break;
    }

    const version: 4 | 6 = ip.includes(':') ? 6 : 4;
    let resolvedData: Partial<IpIntelligence> | null = null;
    let failureReason = '';

    // 3. Try primary provider
    try {
      resolvedData = await queryPrimaryProvider(ip, options);
    } catch (primaryError) {
      failureReason = primaryError instanceof Error ? primaryError.message : 'Primary IP provider failed';
      // 4. Try fallback provider if primary fails
      try {
        if (!options.budget || options.budget.remaining() > 0) {
          resolvedData = await queryFallbackProvider(ip, options);
        }
      } catch (fallbackError) {
        failureReason = `${failureReason}; Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Fallback provider failed'}`;
      }
    }

    let intel: IpIntelligence;
    if (resolvedData) {
      intel = {
        ip,
        version,
        approximate: true,
        available: true,
        ...resolvedData,
      };
    } else {
      intel = {
        ip,
        version,
        approximate: true,
        available: false,
        reason: failureReason || 'IP intelligence lookup failed across all providers',
      };
    }

    // Cache the result
    ipIntelligenceCache.set(ip, {
      data: intel,
      expiresAt: now + CACHE_TTL_MS,
    });

    results.push(intel);
  }

  return results;
}
