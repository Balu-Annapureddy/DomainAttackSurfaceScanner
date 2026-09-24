import type { DomainScan } from '../../../shared/types';

const API_BASE = '/api';

export async function createScan(domain: string): Promise<Pick<DomainScan, 'scanId' | 'domain' | 'status' | 'createdAt'>> {
  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });
  const data = await response.json() as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Unable to start scan');
  }

  return data as Pick<DomainScan, 'scanId' | 'domain' | 'status' | 'createdAt'>;
}

export async function getScan(scanId: string): Promise<DomainScan> {
  const response = await fetch(`${API_BASE}/scan/${encodeURIComponent(scanId)}`);
  const data = await response.json() as DomainScan & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || 'Unable to load scan');
  }

  return data;
}

export async function getScanComparison(
  baselineId: string,
  targetId: string
): Promise<import('../../../shared/types').ScanComparison> {
  const response = await fetch(
    `${API_BASE}/scan/compare/${encodeURIComponent(baselineId)}/${encodeURIComponent(targetId)}`
  );
  const data = (await response.json()) as import('../../../shared/types').ScanComparison & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || 'Unable to compare scans');
  }

  return data;
}
