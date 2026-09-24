import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { config } from '../config';
import type { ScanRequestBudget } from './scanBudget';

export interface ProviderHttpResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface ProviderHttpOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  budget?: ScanRequestBudget;
}

function readBody(response: http.IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        response.destroy(new Error('Provider response exceeded the configured size limit'));
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    response.on('error', reject);
  });
}

export async function fetchProviderJson<T = unknown>(
  urlStr: string,
  options: ProviderHttpOptions = {},
): Promise<T> {
  const url = new URL(urlStr);
  if (url.protocol !== 'https:') {
    throw new Error('Provider requests must strictly use HTTPS');
  }

  if (options.budget) {
    options.budget.consume(1, `Provider query: ${url.hostname}`);
  }

  const timeoutMs = options.timeoutMs ?? config.ipIntelligenceTimeoutMs;

  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error('Provider request aborted'));
      return;
    }

    const request = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DomainAttackSurfaceScanner-ProviderClient/1.0',
        },
        timeout: timeoutMs,
      },
      async (response) => {
        try {
          if ((response.statusCode ?? 0) >= 300 && (response.statusCode ?? 0) < 400) {
            // Disallow arbitrary redirects for provider API queries
            reject(new Error(`Provider returned unexpected redirect status ${response.statusCode}`));
            return;
          }

          if ((response.statusCode ?? 0) >= 400) {
            reject(new Error(`Provider returned HTTP ${response.statusCode}`));
            return;
          }

          const body = await readBody(response, config.maxResponseBytes);
          const data = JSON.parse(body) as T;
          resolve(data);
        } catch (err) {
          reject(err);
        }
      },
    );

    const onAbort = () => {
      request.destroy(new Error('Provider request cancelled by timeout'));
      reject(new Error('Provider request cancelled'));
    };

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    request.on('timeout', () => {
      request.destroy(new Error('Provider request timed out'));
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
