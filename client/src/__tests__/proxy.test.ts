import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleApiProxy,
  sanitizeSetCookie,
  extractSetCookies,
  DEFAULT_BACKEND_URL,
} from '../../../functions/api/[[path]]';

describe('Cloudflare Pages Functions API Reverse Proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeSetCookie', () => {
    it('strips Domain attribute so cookies scope to the Pages origin', () => {
      const original = 'dass_session=xyz123; Path=/; Domain=up.railway.app; HttpOnly; Secure; SameSite=Strict';
      const sanitized = sanitizeSetCookie(original);
      expect(sanitized).not.toContain('Domain=');
      expect(sanitized).toContain('dass_session=xyz123');
      expect(sanitized).toContain('Path=/');
      expect(sanitized).toContain('HttpOnly');
    });

    it('leaves cookies without Domain attribute untouched', () => {
      const original = 'dass_session=xyz123; Path=/; HttpOnly; Secure; SameSite=Lax';
      expect(sanitizeSetCookie(original)).toBe(original);
    });
  });

  describe('extractSetCookies', () => {
    it('extracts multiple cookies when getSetCookie is available', () => {
      const headers = new Headers();
      headers.append('set-cookie', 'c1=v1; Path=/');
      headers.append('set-cookie', 'c2=v2; Path=/');

      const extracted = extractSetCookies(headers);
      expect(extracted.length).toBe(2);
      expect(extracted[0]).toContain('c1=v1');
      expect(extracted[1]).toContain('c2=v2');
    });
  });

  describe('handleApiProxy', () => {
    it('proxies request to DEFAULT_BACKEND_URL preserving method, query, and headers', async () => {
      let fetchedUrl = '';
      let fetchedInit: (RequestInit & { duplex?: string }) | undefined;

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        fetchedUrl = url.toString();
        fetchedInit = init;
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

      const incomingRequest = new Request('https://domainattacksurfacescanner.pages.dev/api/scan?filter=active', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cookie': 'dass_session=session_test_token',
          'user-agent': 'Mozilla/5.0 TestBrowser',
          'cf-connecting-ip': '203.0.113.195',
        },
        body: JSON.stringify({ domain: 'github.com' }),
      });

      const context = {
        request: incomingRequest,
        functionPath: '/api/scan',
        env: {},
        params: { path: ['scan'] },
        data: {},
        waitUntil: vi.fn(),
        next: vi.fn(),
      };

      const response = await handleApiProxy(context as any);

      // Verify destination URL
      expect(fetchedUrl).toBe(`${DEFAULT_BACKEND_URL}/api/scan?filter=active`);
      expect(fetchedInit?.method).toBe('POST');

      // Verify forwarded headers
      const forwardedHeaders = new Headers(fetchedInit?.headers);
      expect(forwardedHeaders.get('host')).toBe(new URL(DEFAULT_BACKEND_URL).host);
      expect(forwardedHeaders.get('cookie')).toBe('dass_session=session_test_token');
      expect(forwardedHeaders.get('origin')).toBe('https://domainattacksurfacescanner.pages.dev');
      expect(forwardedHeaders.get('x-forwarded-for')).toBe('203.0.113.195');

      // Verify response
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });

    it('honors env.BACKEND_URL override if configured in Cloudflare Pages', async () => {
      let fetchedUrl = '';
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
        fetchedUrl = url.toString();
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      });

      const incomingRequest = new Request('https://domainattacksurfacescanner.pages.dev/api/health', {
        method: 'GET',
      });

      const context = {
        request: incomingRequest,
        functionPath: '/api/health',
        env: { BACKEND_URL: 'https://custom-backend.internal.railway.app' },
        params: { path: ['health'] },
        data: {},
        waitUntil: vi.fn(),
        next: vi.fn(),
      };

      await handleApiProxy(context as any);
      expect(fetchedUrl).toBe('https://custom-backend.internal.railway.app/api/health');
    });

    it('sanitizes and forwards Set-Cookie response headers from upstream', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        const headers = new Headers();
        headers.append('set-cookie', 'dass_session=token_abc; Path=/; Domain=up.railway.app; HttpOnly; Secure');
        headers.set('content-type', 'application/json');
        return new Response(JSON.stringify({ user: { id: '1' } }), {
          status: 201,
          headers,
        });
      });

      const incomingRequest = new Request('https://domainattacksurfacescanner.pages.dev/api/auth/login', {
        method: 'POST',
      });

      const context = {
        request: incomingRequest,
        functionPath: '/api/auth/login',
        env: {},
        params: { path: ['auth', 'login'] },
        data: {},
        waitUntil: vi.fn(),
        next: vi.fn(),
      };

      const response = await handleApiProxy(context as any);
      expect(response.status).toBe(201);

      const setCookies = extractSetCookies(response.headers);
      expect(setCookies.length).toBe(1);
      expect(setCookies[0]).toContain('dass_session=token_abc');
      expect(setCookies[0]).not.toContain('Domain=');
    });

    it('returns structured 502 Bad Gateway JSON when upstream is unreachable', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection reset by peer'));

      const incomingRequest = new Request('https://domainattacksurfacescanner.pages.dev/api/scan', {
        method: 'POST',
      });

      const context = {
        request: incomingRequest,
        functionPath: '/api/scan',
        env: {},
        params: { path: ['scan'] },
        data: {},
        waitUntil: vi.fn(),
        next: vi.fn(),
      };

      const response = await handleApiProxy(context as any);
      expect(response.status).toBe(502);

      const data = await response.json();
      expect(data.code).toBe('BAD_GATEWAY');
      expect(data.error).toContain('Unable to reach backend scanner service');
    });

    it('rejects requests outside the /api boundary to prevent open-proxy behavior', async () => {
      const incomingRequest = new Request('https://domainattacksurfacescanner.pages.dev/admin/evil', {
        method: 'GET',
      });

      const context = {
        request: incomingRequest,
        functionPath: '/admin/evil',
        env: {},
        params: {},
        data: {},
        waitUntil: vi.fn(),
        next: vi.fn(),
      };

      const response = await handleApiProxy(context as any);
      expect(response.status).toBe(403);
    });
  });
});
