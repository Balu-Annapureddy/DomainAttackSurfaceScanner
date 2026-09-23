import UAParser from 'ua-parser-js';
import { NetworkInfo } from '../types';
import { Request } from 'express';

export function parseRequest(req: Request): NetworkInfo {
  const ua = new UAParser(req.headers['user-agent'] || '');
  const browser = ua.getBrowser();
  const os = ua.getOS();
  const device = ua.getDevice();
  const cpu = ua.getCPU();

  let deviceCategory: NetworkInfo['deviceCategory'] = 'unknown';
  if (device.type === 'mobile') deviceCategory = 'mobile';
  else if (device.type === 'tablet') deviceCategory = 'tablet';
  else if (!device.type) deviceCategory = 'desktop';

  // Get IP — supports X-Forwarded-For for proxied environments
  const forwarded = req.headers['x-forwarded-for'];
  let ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || 'unknown';

  // Normalize IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // Platform from OS + CPU
  const platform = [os.name, os.version, cpu.architecture]
    .filter(Boolean)
    .join(' ') || 'Unknown';

  const h = req.headers;

  return {
    ipAddress: ip,
    userAgent: h['user-agent'] || '',
    browser: browser.name || 'Unknown',
    browserVersion: browser.version || '',
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
  };
}
