import type { DomainScan, HistoryScanItem, QuotaInfo, User, ScanComparison } from '../../../shared/types';

const API_BASE = '/api';

export async function createScan(domain: string): Promise<Pick<DomainScan, 'scanId' | 'domain' | 'status' | 'createdAt'> & { quota?: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ domain }),
  });
  const data = await response.json() as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Unable to start scan');
  }

  return data as Pick<DomainScan, 'scanId' | 'domain' | 'status' | 'createdAt'> & { quota?: QuotaInfo };
}

export async function getScan(scanId: string): Promise<DomainScan> {
  const response = await fetch(`${API_BASE}/scan/${encodeURIComponent(scanId)}`, {
    credentials: 'include',
  });
  const data = await response.json() as DomainScan & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Unable to load scan');
  }

  return data;
}

export async function getScanComparison(
  baselineId: string,
  targetId: string
): Promise<ScanComparison> {
  const response = await fetch(
    `${API_BASE}/scan/compare/${encodeURIComponent(baselineId)}/${encodeURIComponent(targetId)}`,
    { credentials: 'include' }
  );
  const data = (await response.json()) as ScanComparison & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Unable to compare scans');
  }

  return data;
}

// ─── Authentication & Quotas ─────────────────────────────────

export async function getAuthStatus(): Promise<{ user: User | null; quota: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
  });
  const data = await response.json() as { user: User | null; quota: QuotaInfo; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Unable to verify session');
  }
  return { user: data.user, quota: data.quota };
}

export async function registerUser(email: string, password: string): Promise<{ user: User; quota: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json() as { user: User; quota: QuotaInfo; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return { user: data.user, quota: data.quota };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; quota: QuotaInfo }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json() as { user: User; quota: QuotaInfo; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  return { user: data.user, quota: data.quota };
}

export async function logoutUser(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

export async function getUserScanHistory(): Promise<HistoryScanItem[]> {
  const response = await fetch(`${API_BASE}/scan/user/history`, {
    credentials: 'include',
  });
  const data = await response.json() as { scans?: HistoryScanItem[]; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Unable to retrieve scan history');
  }
  return data.scans || [];
}

export async function deleteSavedScan(scanId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/scan/${encodeURIComponent(scanId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json() as { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Unable to delete scan');
  }
}

export async function deleteAccount(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json() as { success?: boolean; message?: string; error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Unable to delete account');
  }
  return {
    success: data.success ?? true,
    message: data.message ?? 'Account deleted successfully',
  };
}
