/**
 * Cloudflare Pages Functions Reverse Proxy for /api/*
 *
 * Proxies all incoming requests from:
 *   https://domainattacksurfacescanner.pages.dev/api/*
 * to the Railway backend:
 *   https://domainattacksurfacescanner-production.up.railway.app/api/*
 *
 * ARCHITECTURE & SECURITY:
 * 1. Same-Origin Browser Contract:
 *    Browser calls remain same-origin to /api/* with credentials: 'include'.
 * 2. Closed Proxy Boundary:
 *    Only requests matching /api/* are proxied. The target origin is hardcoded
 *    or pulled from Cloudflare Pages environment variables (BACKEND_URL).
 *    Arbitrary upstream URL injection is completely disallowed.
 * 3. Session & Cookie Fidelity:
 *    - Inbound: Cookie header (containing dass_session) is forwarded upstream.
 *    - Outbound: Set-Cookie headers are preserved and sanitized (Domain attribute
 *      stripped so cookies bind strictly to domainattacksurfacescanner.pages.dev).
 * 4. Resilient Error Handling:
 *    Upstream connection drops return structured 502 Bad Gateway JSON instead
 *    of empty responses, eliminating client JSON parsing syntax errors.
 */

export interface Env {
  BACKEND_URL?: string;
  API_UPSTREAM_URL?: string;
}

export interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

export type PagesFunction<
  Env = unknown,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;

export const DEFAULT_BACKEND_URL = 'https://domainattacksurfacescanner-production.up.railway.app';

// RFC 7230 / RFC 2616 hop-by-hop headers to drop
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/**
 * Strips any Domain attribute so cookies bind cleanly to the Pages frontend origin.
 */
export function sanitizeSetCookie(cookie: string): string {
  return cookie.replace(/;\s*Domain=[^;]+/gi, '');
}

/**
 * Extracts all Set-Cookie headers from upstream response across all runtimes.
 */
export function extractSetCookies(headers: Headers): string[] {
  if (typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function') {
    return (headers as unknown as { getSetCookie: () => string[] }).getSetCookie() || [];
  }
  const raw = headers.get('set-cookie');
  return raw ? [raw] : [];
}

/**
 * Core reverse proxy handler for /api/* requests.
 */
export async function handleApiProxy(context: EventContext<Env, string, Record<string, unknown>>): Promise<Response> {
  const { request, env } = context;

  // 1. Resolve upstream base origin
  const rawUpstream = env?.BACKEND_URL || env?.API_UPSTREAM_URL || DEFAULT_BACKEND_URL;
  let upstreamBase: URL;
  try {
    upstreamBase = new URL(rawUpstream);
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Invalid upstream backend URL configuration',
        code: 'PROXY_CONFIG_ERROR',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  // 2. Parse and validate incoming request URL
  const clientUrl = new URL(request.url);

  // Security: enforce that proxy only handles paths under /api
  if (!clientUrl.pathname.startsWith('/api')) {
    return new Response(
      JSON.stringify({
        error: 'Access denied: path outside /api boundary',
        code: 'FORBIDDEN',
      }),
      {
        status: 403,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }

  // 3. Build target destination URL (preserving pathname and search/query string)
  const targetUrl = new URL(`${clientUrl.pathname}${clientUrl.search}`, upstreamBase);

  // 4. Build forwarded headers
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey) || lowerKey === 'host') {
      continue;
    }
    forwardHeaders.set(key, value);
  }

  // Explicitly point Host to the Railway backend
  forwardHeaders.set('host', upstreamBase.host);

  // Pass Client IP to upstream for accurate rate limiting
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) {
    const existingXff = request.headers.get('x-forwarded-for');
    forwardHeaders.set('x-forwarded-for', existingXff ? `${existingXff}, ${clientIp}` : clientIp);
  }

  // Ensure Origin and Forwarded metadata match the canonical Pages domain for CORS compliance
  const clientOrigin = request.headers.get('origin') || clientUrl.origin;
  forwardHeaders.set('origin', clientOrigin);
  forwardHeaders.set('x-forwarded-proto', clientUrl.protocol.replace(':', ''));
  forwardHeaders.set('x-forwarded-host', clientUrl.host);

  // 5. Build request initialization
  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  const requestInit: RequestInit & { duplex?: string } = {
    method,
    headers: forwardHeaders,
    redirect: 'manual',
  };

  if (hasBody && request.body) {
    requestInit.body = request.body;
    requestInit.duplex = 'half';
  }

  // 6. Execute fetch to upstream Railway backend
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl.toString(), requestInit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return new Response(
      JSON.stringify({
        error: 'Unable to reach backend scanner service. Please verify server status.',
        code: 'BAD_GATEWAY',
        upstream: upstreamBase.origin,
        details: message,
      }),
      {
        status: 502,
        statusText: 'Bad Gateway',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  // 7. Reconstruct response headers
  const responseHeaders = new Headers();
  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey) || lowerKey === 'content-encoding') {
      continue;
    }
    if (lowerKey === 'set-cookie') {
      continue; // Handled explicitly below
    }
    responseHeaders.set(key, value);
  }

  // 8. Re-attach sanitized Set-Cookie headers
  const setCookies = extractSetCookies(upstreamResponse.headers);
  for (const rawCookie of setCookies) {
    const sanitized = sanitizeSetCookie(rawCookie);
    responseHeaders.append('set-cookie', sanitized);
  }

  // 9. Return response stream to browser
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const onRequest: PagesFunction<Env> = handleApiProxy;
