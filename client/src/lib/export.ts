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

export function exportScanJson(scan: DomainScan): void {
  const data = JSON.stringify(scan, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const dateStr = new Date(scan.createdAt).toISOString().slice(0, 10);
  triggerDownload(blob, `${scan.domain}-scan-${dateStr}.json`);
}

function escapeCsvCell(val: unknown): string {
  if (val === undefined || val === null) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
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
  const dateStr = new Date(scan.createdAt).toISOString().slice(0, 10);
  triggerDownload(blob, `${scan.domain}-assets-${dateStr}.csv`);
}
