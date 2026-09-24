import type { DomainScan } from '../../../shared/types';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
}

function escapeCsvCell(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export function exportScanJson(scan: DomainScan): void {
  const data = JSON.stringify(scan, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const safeDomain = sanitizeFilename(scan.domain);
  const dateStr = new Date(scan.createdAt).toISOString().slice(0, 10);
  triggerDownload(blob, `${safeDomain}-scan-${dateStr}.json`);
}

export function exportAssetsCsv(scan: DomainScan): void {
  const headers = ['ID', 'Type', 'Value', 'TargetDomain', 'DiscoveredAt', 'PrimarySource', 'EvidenceCount', 'Metadata'];
  const rows = (scan.assets || []).map((asset) => [
    escapeCsvCell(asset.id),
    escapeCsvCell(asset.type),
    escapeCsvCell(asset.value),
    escapeCsvCell(asset.targetDomain),
    escapeCsvCell(asset.discoveredAt),
    escapeCsvCell(asset.evidence?.[0]?.source || 'scanner'),
    escapeCsvCell(asset.evidence?.length || 0),
    escapeCsvCell(asset.metadata ? JSON.stringify(asset.metadata) : ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeDomain = sanitizeFilename(scan.domain);
  const dateStr = new Date(scan.createdAt).toISOString().slice(0, 10);
  triggerDownload(blob, `${safeDomain}-assets-${dateStr}.csv`);
}

export function exportFindingsCsv(scan: DomainScan): void {
  const headers = ['ID', 'Title', 'Severity', 'Kind', 'Category', 'Description', 'Recommendation', 'Confidence', 'PrimarySource'];
  const rows = (scan.findings || []).map((finding) => [
    escapeCsvCell(finding.id),
    escapeCsvCell(finding.title),
    escapeCsvCell(finding.severity),
    escapeCsvCell(finding.kind),
    escapeCsvCell(finding.category),
    escapeCsvCell(finding.description),
    escapeCsvCell(finding.recommendation),
    escapeCsvCell(finding.confidence),
    escapeCsvCell(finding.evidence?.[0]?.source || 'analysis'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeDomain = sanitizeFilename(scan.domain);
  const dateStr = new Date(scan.createdAt).toISOString().slice(0, 10);
  triggerDownload(blob, `${safeDomain}-findings-${dateStr}.csv`);
}
