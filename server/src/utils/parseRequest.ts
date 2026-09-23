import UAParser from 'ua-parser-js';
import { NetworkInfo } from '../types';
import { Request } from 'express';
import { cleanIpAddress, detectIpVersion, isPrivateOrReservedIp } from '../services/geoService';

export function parseRequest(req: Request): NetworkInfo {
  const ua = new UAParser(req.headers['user-agent'] || '');
  const browser = ua.getBrowser();
  const os = ua.getOS();
  const device = ua.getDevice();
  const cpu = ua.getCPU();
  const engine = ua.getEngine();

  let deviceCategory: NetworkInfo['deviceCategory'] = 'unknown';
  if (device.type === 'mobile') deviceCategory = 'mobile';
  else if (device.type === 'tablet') deviceCategory = 'tablet';
  else if (!device.type) deviceCategory = 'desktop';

  // Extract client IP safely
  const forwarded = req.headers['x-forwarded-for'];
  let rawIp: string;
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    // In proxy setups, take the first valid IP from the chain
    rawIp = (forwarded.split(',')[0] || 'unknown').trim();
  } else {
    rawIp = req.socket.remoteAddress || req.ip || 'unknown';
  }

  const ipAddress = cleanIpAddress(rawIp);
  const ipVersion = detectIpVersion(ipAddress);
  const isLocalhostOrPrivate = isPrivateOrReservedIp(ipAddress);

  // Platform from OS + CPU
  const platform = [os.name, os.version, cpu.architecture]
    .filter(Boolean)
    .join(' ') || 'Unknown';

  const h = req.headers;

  return {
    ipAddress,
    ipVersion,
    isLocalhostOrPrivate,
    userAgent: (h['user-agent'] as string) || '',
    browser: browser.name || 'Unknown',
    browserVersion: browser.version || '',
    engine: engine.name ? `${engine.name} ${engine.version || ''}`.trim() : null,
    os: os.name || 'Unknown',
    osVersion: os.version || '',
    platform,
    deviceCategory,
    referrer: (h.referer || h.referrer || null) as string | null,
    timestamp: new Date().toISOString(),
    // HTTP headers
    accept: (h.accept as string) || null,
    acceptLanguage: (h['accept-language'] as string) || null,
    acceptEncoding: (h['accept-encoding'] as string) || null,
    origin: (h.origin as string) || null,
    secFetchSite: (h['sec-fetch-site'] as string) || null,
    secFetchMode: (h['sec-fetch-mode'] as string) || null,
    secFetchDest: (h['sec-fetch-dest'] as string) || null,
    uaClientHint: (h['sec-ch-ua'] as string) || null,
    secChUaPlatform: (h['sec-ch-ua-platform'] as string) || null,
    secChUaMobile: (h['sec-ch-ua-mobile'] as string) || null,
  };
}
