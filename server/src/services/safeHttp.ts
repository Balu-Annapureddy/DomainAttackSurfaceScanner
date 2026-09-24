import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { URL } from 'node:url';
import { config } from '../config';
import { isPublicAddress, resolvePublicAddresses } from './publicResolution';

export interface SafeHttpResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  redirectChain: string[];
}

function readBody(response: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > config.maxResponseBytes) {
        response.destroy(new Error('Response exceeded the configured size limit'));
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    response.on('error', reject);
  });
}

async function requestOnce(url: URL): Promise<SafeHttpResponse> {
  const addresses = await resolvePublicAddresses(url.hostname);
  const address = addresses[0];
  if (!address || !isPublicAddress(address)) {
    throw new Error('Redirect destination is not public');
  }

  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request({
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        Host: url.host,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'User-Agent': 'DomainAttackSurfaceScanner/1.0',
      },
      timeout: 8000,
      lookup: (_hostname, _options, callback) => callback(null, address, net.isIPv6(address) ? 6 : 4),
      ...(url.protocol === 'https:' ? { servername: url.hostname, rejectUnauthorized: false } : {}),
    }, async (response) => {
      try {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(response.headers)) {
          headers[key] = Array.isArray(value) ? value.join(', ') : value ?? '';
        }
        resolve({
          url: url.toString(),
          status: response.statusCode ?? 0,
          headers,
          body: await readBody(response),
          redirectChain: [url.toString()],
        });
      } catch (error) {
        reject(error);
      }
    });
    request.on('timeout', () => request.destroy(new Error('Request timed out')));
    request.on('error', reject);
    request.end();
  });
}

export async function safeGet(startUrl: string): Promise<SafeHttpResponse> {
  let current = new URL(startUrl);
  if (!['http:', 'https:'].includes(current.protocol)) {
    throw new Error('Only HTTP and HTTPS destinations are supported');
  }

  const chain: string[] = [];
  for (let redirects = 0; redirects <= config.maxRedirects; redirects += 1) {
    const response = await requestOnce(current);
    chain.push(current.toString());
    response.redirectChain = [...chain];
    const location = response.headers.location;
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
      return response;
    }
    if (redirects === config.maxRedirects) {
      throw new Error('Maximum redirect count exceeded');
    }
    current = new URL(location, current);
    if (!['http:', 'https:'].includes(current.protocol)) {
      throw new Error('Redirect destination uses an unsupported protocol');
    }
  }

  throw new Error('Maximum redirect count exceeded');
}
