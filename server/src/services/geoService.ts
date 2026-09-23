// ─── IP Geolocation Service ───────────────────────────────────────────────────
// Uses ipapi.co by default (free tier, no API key required for basic use).
// Provider URL and optional API key are configurable via environment variables.
// Returns null if the lookup fails or is disabled.

import { GeoInfo } from '../types';
import { config } from '../config';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd/i,
  /^fe80:/i,
  /^localhost$/i,
  /^unknown$/i,
];

function isPrivateIp(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/i, '').trim();
  return PRIVATE_IP_PATTERNS.some(p => p.test(clean));
}

export async function lookupGeo(ip: string): Promise<GeoInfo | null> {
  if (!config.geoEnabled) return null;
  const cleanIp = ip.replace(/^::ffff:/i, '').trim();
  if (isPrivateIp(cleanIp)) return null;

  try {
    const url = config.geoProviderUrl.replace('{ip}', encodeURIComponent(ip));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.geoTimeoutMs);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'ReconLab/1.0',
    };
    if (config.geoApiKey) {
      headers['Authorization'] = `Token ${config.geoApiKey}`;
    }

    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json() as any;

    // ipapi.co response mapping
    return {
      country: data.country_name || data.country || null,
      countryCode: data.country_code || null,
      region: data.region || null,
      city: data.city || null,
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
      timezone: data.timezone || null,
      isp: data.org || data.isp || null,
      org: data.org || null,
      asn: data.asn || null,
    };
  } catch {
    // Silently return null on any failure — geo is best-effort only
    return null;
  }
}
