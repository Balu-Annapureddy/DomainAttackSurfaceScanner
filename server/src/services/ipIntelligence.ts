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
  approximate: true;
  available: boolean;
  reason?: string;
}

export interface IpIntelligenceOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
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

  for (const ip of uniqueAddresses) {
    if (options.budget && options.budget.remaining() <= 0) {
      results.push({
        ip,
        version: ip.includes(':') ? 6 : 4,
        approximate: true,
        available: false,
        reason: 'Scan request budget exhausted',
      });
      break;
    }

    try {
      const data = await fetchProviderJson<Record<string, unknown>>(
        config.ipIntelligenceUrl.replace('{ip}', encodeURIComponent(ip)),
        { signal: options.signal, budget: options.budget },
      );
      results.push({
        ip,
        version: ip.includes(':') ? 6 : 4,
        asn: typeof data.asn === 'string' ? data.asn : undefined,
        organization: typeof data.org === 'string' ? data.org : undefined,
        network: typeof data.network === 'string' ? data.network : undefined,
        country: typeof data.country_name === 'string' ? data.country_name : undefined,
        region: typeof data.region === 'string' ? data.region : undefined,
        city: typeof data.city === 'string' ? data.city : undefined,
        latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
        longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
        reverseDns: typeof data.hostname === 'string' ? data.hostname : undefined,
        approximate: true,
        available: true,
      });
    } catch (error) {
      results.push({
        ip,
        version: ip.includes(':') ? 6 : 4,
        approximate: true,
        available: false,
        reason: error instanceof Error ? error.message : 'IP intelligence provider unavailable',
      });
    }
  }
  return results;
}
