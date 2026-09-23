import type { DomainScan } from '../../../shared/types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseExpiryDays(value: string | undefined | null): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function computeExposureScore(scan: DomainScan): number {
  // The score is a transparent heuristic for passive security posture. It blends the keys
  // that are available from public information sources without pretending to be a full risk model.
  const http = scan.categories.http.data as {
    https?: { missingSecurityHeaders?: string[]; status?: number; };
    httpsEnforced?: boolean;
    worryingHeaders?: string[];
  } | undefined;

  const tls = scan.categories.tls.data as {
    available?: boolean;
    validTo?: string | null;
  } | undefined;

  const whois = scan.categories.whois.data as {
    privacyStatus?: 'public' | 'redacted' | 'unknown';
  } | undefined;

  const subdomains = scan.categories.subdomains.data as {
    subdomains?: string[];
  } | undefined;

  let score = 100;

  const missingHeaders = http?.https?.missingSecurityHeaders ?? http?.worryingHeaders ?? [];
  score -= Math.min(30, missingHeaders.length * 6);

  if (!http?.httpsEnforced) {
    score -= 15;
  }

  if (!tls || tls.available === false) {
    score -= 20;
  }

  const certDaysLeft = parseExpiryDays(tls?.validTo ?? null);
  if (certDaysLeft !== null) {
    if (certDaysLeft <= 7) {
      score -= 25;
    } else if (certDaysLeft <= 30) {
      score -= 10;
    }
  }

  const discoveredSubdomains = Array.isArray(subdomains?.subdomains) ? subdomains.subdomains.length : 0;
  score -= Math.min(10, Math.ceil(discoveredSubdomains / 25));

  if (whois?.privacyStatus === 'redacted') {
    score -= 5;
  }

  return clamp(Math.round(score), 0, 100);
}
