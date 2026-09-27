import type { DomainScan, HistoryScanItem, QuotaInfo, User, ScanComparison } from '../../../shared/types';

const API_BASE = '/api';

/**
 * Safely parse JSON from fetch responses.
 * Prevents "Unexpected end of JSON input" errors when upstream returns empty or non-JSON payloads
 * (e.g. 502/503/504 Bad Gateway, 404 HTML, or 204 No Content).
 */
export async function parseApiResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  let text = '';
  try {
    text = await response.text();
  } catch {
    // Stream read error or aborted
  }

  const trimmed = text.trim();
  let parsed: unknown = null;

  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Body is not valid JSON
    }
  }

  if (!response.ok) {
    // 1. Try to extract structured error message from JSON { error: "...", message: "..." }
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const errorMsg = typeof record.error === 'string' ? record.error : typeof record.message === 'string' ? record.message : null;
      if (errorMsg && errorMsg.trim()) {
        throw new Error(errorMsg.trim());
      }
    }

    // 2. If short plaintext error message from server (not HTML)
    if (trimmed && !trimmed.startsWith('<') && trimmed.length <= 200) {
      throw new Error(trimmed);
    }

    // 3. Status-code specific helpful error messages
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. You do not have permission to perform this action.');
    }
    if (response.status === 404) {
      throw new Error(`${fallbackError}: Resource not found (404)`);
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(`Upstream scanner service temporarily unavailable (${response.status}). Please try again shortly.`);
    }

    throw new Error(`${fallbackError} (HTTP ${response.status})`);
  }

  // If response is OK (2xx) but body was empty
  if (!parsed) {
    if (!trimmed) {
      return {} as T;
    }
    throw new Error(`Invalid response format from server: expected JSON but received ${contentType || 'non-JSON'}`);
  }

  return parsed as T;
}

export async function createScan(domain: string): Promise<Pick<DomainScan, 'scanId' | 'domain' | 'status' | 'createdAt'> & { quota?: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ domain }),
  });

  return parseApiResponse<Pick<DomainScan, 'scanId' | 'domain' | 'status' | 'createdAt'> & { quota?: QuotaInfo }>(
    response,
    'Unable to start scan'
  );
}

export async function getScan(scanId: string): Promise<DomainScan> {
  const response = await fetch(`${API_BASE}/scan/${encodeURIComponent(scanId)}`, {
    credentials: 'include',
  });

  return parseApiResponse<DomainScan>(response, 'Unable to load scan');
}

export async function getScanComparison(
  baselineId: string,
  targetId: string
): Promise<ScanComparison> {
  const response = await fetch(
    `${API_BASE}/scan/compare/${encodeURIComponent(baselineId)}/${encodeURIComponent(targetId)}`,
    { credentials: 'include' }
  );

  return parseApiResponse<ScanComparison>(response, 'Unable to compare scans');
}

// ─── Authentication & Quotas ─────────────────────────────────

export async function getAuthStatus(): Promise<{ user: User | null; quota: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
  });

  return parseApiResponse<{ user: User | null; quota: QuotaInfo }>(response, 'Unable to verify session');
}

export async function registerUser(email: string, password: string): Promise<{ user: User; quota: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  return parseApiResponse<{ user: User; quota: QuotaInfo }>(response, 'Registration failed');
}

export async function loginUser(email: string, password: string): Promise<{ user: User; quota: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  return parseApiResponse<{ user: User; quota: QuotaInfo }>(response, 'Login failed');
}

export async function logoutUser(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    await parseApiResponse(response, 'Logout failed');
  }
}

export async function getUserScanHistory(): Promise<HistoryScanItem[]> {
  const response = await fetch(`${API_BASE}/scan/user/history`, {
    credentials: 'include',
  });

  const data = await parseApiResponse<{ scans?: HistoryScanItem[] }>(response, 'Unable to retrieve scan history');
  return data.scans || [];
}

export async function deleteSavedScan(scanId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/scan/${encodeURIComponent(scanId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  await parseApiResponse<{ success?: boolean }>(response, 'Unable to delete scan');
}

export async function deleteAccount(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await parseApiResponse<{ success?: boolean; message?: string }>(response, 'Unable to delete account');
  return {
    success: data.success ?? true,
    message: data.message ?? 'Account deleted successfully',
  };
}

export async function resendVerification(email?: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  return parseApiResponse<{ success: boolean; message: string }>(response, 'Unable to resend verification email');
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/auth/verify?token=${encodeURIComponent(token)}`, {
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  return parseApiResponse<{ success: boolean; message: string }>(response, 'Unable to verify email');
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  return parseApiResponse<{ success: boolean; message: string }>(response, 'Unable to submit password reset request');
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, password }),
  });

  return parseApiResponse<{ success: boolean; message: string }>(response, 'Unable to reset password');
}
