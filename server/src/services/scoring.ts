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
  // Discovery inventory (subdomain count, WHOIS privacy status, ASN, geolocation) represents
  // contextual intelligence rather than security penalties.
  const http = scan.categories.http.data as {
    https?: { missingSecurityHeaders?: string[]; status?: number };
    httpsEnforced?: boolean;
    worryingHeaders?: string[];
  } | undefined;

  const tls = scan.categories.tls.data as {
    available?: boolean;
    validTo?: string | null;
  } | undefined;

  const dns = scan.categories.dns.data as {
    spf?: { present?: boolean };
    dmarc?: { present?: boolean };
  } | undefined;

  let score = 100;

  // 1. TLS Service availability
  if (!tls || tls.available === false) {
    score -= 25;
  } else {
    // Certificate expiration posture
    const certDaysLeft = parseExpiryDays(tls?.validTo ?? null);
    if (certDaysLeft !== null) {
      if (certDaysLeft <= 7) {
        score -= 25;
      } else if (certDaysLeft <= 30) {
        score -= 10;
      }
    }
  }

  // 2. HTTPS enforcement (HTTP properly redirects to HTTPS)
  if (!http?.httpsEnforced) {
    score -= 20;
  }

  // 3. Security response headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
  const missingHeaders = http?.https?.missingSecurityHeaders ?? http?.worryingHeaders ?? [];
  score -= Math.min(25, missingHeaders.length * 5);

  // 4. Email authentication configuration (SPF & DMARC)
  if (dns && dns.spf && !dns.spf.present) {
    score -= 5;
  }
  if (dns && dns.dmarc && !dns.dmarc.present) {
    score -= 5;
  }

  return clamp(Math.round(score), 0, 100);
}
