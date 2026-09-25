import { randomUUID } from 'node:crypto';
import type { DomainScan, ScanCategory } from '../../../shared/types';

export type CategoryRuntimeStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ScanRecord = DomainScan & {
  categories: Record<ScanCategory, {
    status: CategoryRuntimeStatus;
    startedAt?: string;
    completedAt?: string;
    data?: unknown;
    error?: string;
  }>;
};

const scanStore = new Map<string, ScanRecord>();
const TTL_MS = 24 * 60 * 60 * 1000;

function makeEmptyCategories(): ScanRecord['categories'] {
  return {
    whois: { status: 'pending' },
    dns: { status: 'pending' },
    subdomains: { status: 'pending' },
    tls: { status: 'pending' },
    http: { status: 'pending' },
    exposure: { status: 'pending' },
    scoring: { status: 'pending' },
  };
}

export function createScanRecord(domain: string): ScanRecord {
  const now = Date.now();
  const record: ScanRecord = {
    scanId: randomUUID(),
    domain,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
    status: 'running',
    scoreLabel: 'External Hygiene Score',
    categories: makeEmptyCategories(),
    assets: [],
    relationships: [],
    findings: [],
    warnings: [],
  };

  scanStore.set(record.scanId, record);
  return record;
}

export function getScanRecord(scanId: string): ScanRecord | undefined {
  const scan = scanStore.get(scanId);
  if (!scan) {
    return undefined;
  }

  if (Date.now() > Date.parse(scan.expiresAt)) {
    scanStore.delete(scanId);
    return undefined;
  }

  return scan;
}

export function updateCategoryStatus(
  scanId: string,
  category: ScanCategory,
  status: CategoryRuntimeStatus,
  data?: unknown,
  error?: string,
): void {
  const scan = getScanRecord(scanId);
  if (!scan) {
    return;
  }

  scan.categories[category] = {
    ...scan.categories[category],
    status,
    data,
    error,
    startedAt: scan.categories[category].startedAt ?? new Date().toISOString(),
    completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined,
  };
}

export function setScanScore(scanId: string, score: number): void {
  const scan = getScanRecord(scanId);
  if (!scan) {
    return;
  }

  scan.score = score;
}

export function markScanFinished(scanId: string): void {
  const scan = getScanRecord(scanId);
  if (!scan) {
    return;
  }

  scan.status = scan.warnings.length ? 'completed_with_warnings' : 'completed';
}

export function setScanIntelligence(
  scanId: string,
  intelligence: Pick<ScanRecord, 'assets' | 'relationships' | 'findings' | 'warnings'> & {
    completeness?: DomainScan['completeness'];
    completenessDetails?: DomainScan['completenessDetails'];
  },
): void {
  const scan = getScanRecord(scanId);
  if (!scan) return;
  scan.assets = intelligence.assets;
  scan.relationships = intelligence.relationships;
  scan.findings = intelligence.findings;
  scan.warnings = intelligence.warnings;
  if (intelligence.completeness) {
    scan.completeness = intelligence.completeness;
  }
  if (intelligence.completenessDetails) {
    scan.completenessDetails = intelligence.completenessDetails;
  }
}

export function clearScanStore(): void {
  scanStore.clear();
}
