// ─── IP Geolocation Service ───────────────────────────────────────────────────
// Provides IP-derived approximate location intelligence.
// Clearly identified as approximate network-level location, never physical precision.
// Handles localhost and private IP address ranges safely without external network calls.

import { GeoInfo, GeoStatus } from '../types';
import { config } from '../config';

// ─── Private / Reserved IP Patterns ───────────────────────────────────────────
const LOCALHOST_PATTERNS = [
  /^127\./,
  /^::1$/,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^::$/,
];

const PRIVATE_IP_PATTERNS = [
  /^10\./,                                     // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,                // 172.16.0.0/12
  /^192\.168\./,                               // 192.168.0.0/16
  /^169\.254\./,                               // Link-local 169.254.0.0/16
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // CGNAT 100.64.0.0/10
  /^fc00:/i,                                   // Unique Local IPv6
  /^fd[0-9a-f]{2}:/i,                          // Unique Local IPv6
  /^fe80:/i,                                   // Link-Local IPv6
  /^unknown$/i,
];

export function cleanIpAddress(rawIp: string): string {
  if (!rawIp) return 'unknown';
  let ip = rawIp.trim();
  // Strip IPv4-mapped IPv6 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
}

export function detectIpVersion(ip: string): 'IPv4' | 'IPv6' | 'unknown' {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes('.')) return 'IPv4';
  if (ip.includes(':')) return 'IPv6';
  return 'unknown';
}

export function isLocalhost(ip: string): boolean {
  const clean = cleanIpAddress(ip);
  return LOCALHOST_PATTERNS.some(p => p.test(clean));
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = cleanIpAddress(ip);
  if (isLocalhost(clean)) return true;
  return PRIVATE_IP_PATTERNS.some(p => p.test(clean));
}

function isValidCoordinate(lat: unknown, lon: unknown): { valid: boolean; lat: number | null; lon: number | null } {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return { valid: false, lat: null, lon: null };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { valid: false, lat: null, lon: null };
  }
  return { valid: true, lat, lon };
}

export async function lookupGeo(rawIp: string): Promise<GeoInfo> {
  const ip = cleanIpAddress(rawIp);
  const ipVersion = detectIpVersion(ip);
  const lookupTimestamp = new Date().toISOString();

  // ── Localhost Handling ──
  if (isLocalhost(ip)) {
    return {
      ip,
      ipVersion,
      status: 'localhost',
      country: null,
      countryCode: null,
      region: null,
      city: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      org: null,
      asn: null,
      provider: 'Internal Resolver (Localhost)',
      lookupTimestamp,
      note: 'Localhost / private address. IP geolocation unavailable.',
    };
  }

  // ── Private / Reserved IP Handling ──
  if (isPrivateOrReservedIp(ip)) {
    return {
      ip,
      ipVersion,
      status: 'private',
      country: null,
      countryCode: null,
      region: null,
      city: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      org: null,
      asn: null,
      provider: 'Internal Resolver (Private Range)',
      lookupTimestamp,
      note: 'Private/reserved IP address. External IP geolocation skipped.',
    };
  }

  // ── Feature Flag Check ──
  if (!config.geoEnabled) {
    return {
      ip,
      ipVersion,
      status: 'unavailable',
      country: null,
      countryCode: null,
      region: null,
      city: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      org: null,
      asn: null,
      provider: 'Disabled',
      lookupTimestamp,
      note: 'IP geolocation service is disabled in configuration.',
    };
  }

  // ── External Provider Lookup (ipapi.co default) ──
  try {
    const url = config.geoProviderUrl.replace('{ip}', encodeURIComponent(ip));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.geoTimeoutMs);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'ReconLab/2.0 (Security Telemetry Research)',
    };
    if (config.geoApiKey) {
      headers['Authorization'] = `Token ${config.geoApiKey}`;
    }

    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        ip,
        ipVersion,
        status: 'failed',
        country: null,
        countryCode: null,
        region: null,
        city: null,
        postalCode: null,
        latitude: null,
        longitude: null,
        timezone: null,
        isp: null,
        org: null,
        asn: null,
        provider: 'ipapi.co',
        lookupTimestamp,
        note: `IP geolocation provider responded with HTTP ${res.status}.`,
      };
    }

    const data = await res.json() as any;

    if (data.error) {
      return {
        ip,
        ipVersion,
        status: 'failed',
        country: null,
        countryCode: null,
        region: null,
        city: null,
        postalCode: null,
        latitude: null,
        longitude: null,
        timezone: null,
        isp: null,
        org: null,
        asn: null,
        provider: 'ipapi.co',
        lookupTimestamp,
        note: data.reason || 'IP geolocation lookup failed from provider.',
      };
    }

    const coords = isValidCoordinate(data.latitude, data.longitude);

    return {
      ip,
      ipVersion,
      status: 'available',
      country: data.country_name || data.country || null,
      countryCode: data.country_code || null,
      region: data.region || null,
      city: data.city || null,
      postalCode: data.postal || data.zip || null,
      latitude: coords.lat,
      longitude: coords.lon,
      timezone: data.timezone || null,
      isp: data.org || data.isp || null,
      org: data.org || null,
      asn: data.asn || null,
      provider: 'ipapi.co',
      lookupTimestamp,
      note: 'IP-derived approximate location (network provider estimate).',
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      ip,
      ipVersion,
      status: 'failed',
      country: null,
      countryCode: null,
      region: null,
      city: null,
      postalCode: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      org: null,
      asn: null,
      provider: 'ipapi.co',
      lookupTimestamp,
      note: isTimeout ? 'IP geolocation request timed out.' : 'IP geolocation network lookup failed.',
    };
  }
}
