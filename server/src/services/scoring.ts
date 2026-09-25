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
  // The score is an external hygiene score measuring observable configuration posture:
  // TLS availability, certificate validity, HTTPS enforcement, security headers, and email authentication.
  // CRITICAL PRINCIPLE: Failed or inconclusive category checks do NOT deduct points.
  // Incomplete evidence reduces completeness, not security posture.
  let score = 100;

  const tlsCategory = scan.categories.tls;
  const httpCategory = scan.categories.http;
  const dnsCategory = scan.categories.dns;

  const tls = tlsCategory?.status === 'completed'
    ? (tlsCategory.data as { available?: boolean; validTo?: string | null; reason?: string } | undefined)
    : undefined;

  const http = httpCategory?.status === 'completed'
    ? (httpCategory.data as {
        http?: { status?: number };
        https?: { missingSecurityHeaders?: string[]; status?: number };
        httpsEnforced?: boolean;
        httpAvailable?: boolean;
        worryingHeaders?: string[];
      } | undefined)
    : undefined;

  const dns = dnsCategory?.status === 'completed'
    ? (dnsCategory.data as {
        spf?: { present?: boolean };
        dmarc?: { present?: boolean };
        mx?: string[];
      } | undefined)
    : undefined;

  // 1. TLS Certificate Validity and Encryption (only if TLS category completed)
  if (tlsCategory?.status === 'completed') {
    if (tls?.available === true) {
      const certDaysLeft = parseExpiryDays(tls.validTo ?? null);
      if (certDaysLeft !== null) {
        if (certDaysLeft <= 7) {
          score -= 25;
        } else if (certDaysLeft <= 30) {
          score -= 10;
        }
      }
    } else if (tls?.available === false) {
      // Completed TLS check confirmed no TLS service
      score -= 25;
    }
  }

  // 2. HTTPS enforcement (HTTP properly redirects to HTTPS, only if HTTP category completed)
  if (httpCategory?.status === 'completed' && http?.httpsEnforced === false) {
    score -= 20;
  }

  // 3. Security response headers (only evaluated if HTTP category completed)
  if (httpCategory?.status === 'completed') {
    const missingHeaders = http?.https?.missingSecurityHeaders ?? http?.worryingHeaders ?? [];
    score -= Math.min(25, missingHeaders.length * 5);
  }

  // 4. Email authentication configuration (SPF & DMARC, only if DNS category completed)
  if (dnsCategory?.status === 'completed' && dns) {
    if (dns.spf && !dns.spf.present) {
      score -= 5;
    }
    if (dns.dmarc && !dns.dmarc.present) {
      score -= 5;
    }
  }

  return clamp(Math.round(score), 0, 100);
}
