import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { URL } from 'node:url';
import { config } from '../config';
import { isPublicAddress, resolvePublicAddresses } from './publicResolution';
import type { ScanRequestBudget } from './scanBudget';

export interface SafeHttpResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  redirectChain: string[];
}

export interface SafeHttpOptions {
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
  timeoutMs?: number;
}

function readBody(response: http.IncomingMessage, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];

    const onAbort = () => {
      response.destroy(new Error('HTTP response aborted'));
      reject(new Error('HTTP response aborted'));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > config.maxResponseBytes) {
        if (signal) signal.removeEventListener('abort', onAbort);
        response.destroy(new Error('Response exceeded the configured size limit'));
        return;
      }
      chunks.push(Buffer.from(chunk));
    });

    response.on('end', () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    response.on('error', (err) => {
      if (signal) signal.removeEventListener('abort', onAbort);
      reject(err);
    });
  });
}

async function requestOnce(url: URL, options: SafeHttpOptions): Promise<SafeHttpResponse> {
  if (options.signal?.aborted) {
    throw new Error('HTTP request aborted before starting');
  }

  if (options.budget) {
    options.budget.consume(1, `HTTP target: ${url.hostname}`);
  }

  const addresses = await resolvePublicAddresses(url.hostname);
  const address = addresses.find((a) => net.isIPv4(a)) ?? addresses[0];
  if (!address || !isPublicAddress(address)) {
    throw new Error('Redirect destination is not public');
  }

  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error('HTTP request aborted'));
      return;
    }

    const transport = url.protocol === 'https:' ? https : http;
    const timeoutMs = options.timeoutMs ?? 8000;

    const request = transport.request(
      {
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          Host: url.host,
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (DomainAttackSurfaceScanner/1.0; Passive-Recon)',
        },
        timeout: timeoutMs,
        lookup: (_hostname, _options, callback) => {
          if (options.signal?.aborted) {
            callback(new Error('Lookup aborted'), '', 4);
            return;
          }
          callback(null, address, net.isIPv6(address) ? 6 : 4);
        },
        ...(url.protocol === 'https:' ? { servername: url.hostname, rejectUnauthorized: false } : {}),
      },
      async (response) => {
        try {
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(response.headers)) {
            headers[key] = Array.isArray(value) ? value.join(', ') : value ?? '';
          }
          const body = await readBody(response, options.signal);
          resolve({
            url: url.toString(),
            status: response.statusCode ?? 0,
            headers,
            body,
            redirectChain: [url.toString()],
          });
        } catch (error) {
          reject(error);
        }
      },
    );

    const onAbort = () => {
      request.destroy(new Error('HTTP request cancelled by signal'));
      reject(new Error('HTTP request cancelled'));
    };

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    request.on('timeout', () => {
      request.destroy(new Error('Request timed out'));
    });

    request.on('error', (err) => {
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      reject(err);
    });

    request.end();
  });
}

export async function safeGet(startUrl: string, options: SafeHttpOptions = {}): Promise<SafeHttpResponse> {
  let current = new URL(startUrl);
  if (!['http:', 'https:'].includes(current.protocol)) {
    throw new Error('Only HTTP and HTTPS destinations are supported');
  }

  const chain: string[] = [];
  for (let redirects = 0; redirects <= config.maxRedirects; redirects += 1) {
    const response = await requestOnce(current, options);
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
