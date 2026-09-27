import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseApiResponse,
  createScan,
  getScan,
  getAuthStatus,
  loginUser,
  logoutUser,
  getUserScanHistory,
  deleteAccount,
} from '../api';

describe('client API client error parsing (parseApiResponse)', () => {
  it('handles empty response bodies on errors without throwing "Unexpected end of JSON input"', async () => {
    const mockResponse = new Response('', {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'content-type': 'text/plain' },
    });

    await expect(parseApiResponse(mockResponse, 'Operation failed')).rejects.toThrow(
      'Upstream scanner service temporarily unavailable (502). Please try again shortly.'
    );
  });

  it('handles 404 HTML responses gracefully', async () => {
    const mockResponse = new Response('<!DOCTYPE html><html><body>404 Not Found</body></html>', {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'text/html' },
    });

    await expect(parseApiResponse(mockResponse, 'Unable to load scan')).rejects.toThrow(
      'Unable to load scan: Resource not found (404)'
    );
  });

  it('extracts structured error messages from JSON payloads', async () => {
    const mockResponse = new Response(
      JSON.stringify({ error: 'Domain format invalid or rejected' }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }
    );

    await expect(parseApiResponse(mockResponse, 'Fallback')).rejects.toThrow(
      'Domain format invalid or rejected'
    );
  });

  it('extracts message property if error is not present', async () => {
    const mockResponse = new Response(
      JSON.stringify({ message: 'Rate limit hit' }),
      {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }
    );

    await expect(parseApiResponse(mockResponse, 'Fallback')).rejects.toThrow(
      'Rate limit hit'
    );
  });

  it('handles 429 rate limit with default text if empty', async () => {
    const mockResponse = new Response('', {
      status: 429,
    });

    await expect(parseApiResponse(mockResponse, 'Fallback')).rejects.toThrow(
      'Rate limit exceeded. Please wait a moment before trying again.'
    );
  });

  it('returns parsed data on 200 OK responses', async () => {
    const payload = { scanId: 'test-123', domain: 'example.com', status: 'completed' };
    const mockResponse = new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const result = await parseApiResponse(mockResponse, 'Fallback');
    expect(result).toEqual(payload);
  });

  it('handles empty 204 No Content responses without failing', async () => {
    const mockResponse = new Response(null, {
      status: 204,
      statusText: 'No Content',
    });

    const result = await parseApiResponse(mockResponse, 'Fallback');
    expect(result).toEqual({});
  });
});

describe('client API methods integration with fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createScan calls /api/scan with credentials: include and POST body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          scanId: 'scan-abc',
          domain: 'example.com',
          status: 'pending',
          createdAt: new Date().toISOString(),
        }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await createScan('example.com');
    expect(res.scanId).toBe('scan-abc');
    expect(fetchSpy).toHaveBeenCalledWith('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ domain: 'example.com' }),
    });
  });

  it('getScan calls /api/scan/:id with credentials: include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          scanId: 'scan-123',
          domain: 'example.com',
          status: 'completed',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await getScan('scan-123');
    expect(res.scanId).toBe('scan-123');
    expect(fetchSpy).toHaveBeenCalledWith('/api/scan/scan-123', {
      credentials: 'include',
    });
  });

  it('getAuthStatus calls /api/auth/me with credentials: include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: 'u1', email: 'test@example.com' },
          quota: { remaining: 5, limit: 5 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await getAuthStatus();
    expect(res.user?.email).toBe('test@example.com');
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/me', {
      credentials: 'include',
    });
  });

  it('loginUser sends credentials: include and receives user session', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: 'u2', email: 'user@example.com' },
          quota: { remaining: 10, limit: 10 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await loginUser('user@example.com', 'SecureP@ssw0rd123');
    expect(res.user.email).toBe('user@example.com');
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: 'user@example.com', password: 'SecureP@ssw0rd123' }),
    });
  });

  it('logoutUser calls /api/auth/logout with credentials: include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Logged out' }), { status: 200 })
    );

    await logoutUser();
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  });

  it('getUserScanHistory calls /api/scan/user/history with credentials: include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ scans: [{ scanId: 's1', domain: 'test.com' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const scans = await getUserScanHistory();
    expect(scans).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/scan/user/history', {
      credentials: 'include',
    });
  });

  it('deleteAccount calls /api/auth/me with DELETE and credentials: include', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: 'Account deleted' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const res = await deleteAccount();
    expect(res.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/me', {
      method: 'DELETE',
      credentials: 'include',
    });
  });
});
