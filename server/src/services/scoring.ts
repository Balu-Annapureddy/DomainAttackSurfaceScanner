/**
 * External Hygiene Score — v2 expanded 12-category hygiene scoring model
 *
 * The score is a deterministic 0–100 configuration-hygiene summary based only
 * on completed, evidence-backed observations. It is NOT an exploitability score.
 *
 * 12-Category Model & Weights:
 *   1.  TLS Hygiene                      20 pts max
 *   2.  HTTPS Enforcement                15 pts max
 *   3.  Web Security Headers             15 pts max
 *   4.  Email Security (SPF/DMARC)       10 pts max
 *   5.  DNSSEC Hygiene                    3 pts max
 *   6.  Network Exposure (ports/CVEs)    15 pts max
 *   7.  Certificate Chain Correctness     7 pts max (NEW)
 *   8.  Subdomain Takeover Risk          15 pts max (NEW)
 *   9.  Domain & WHOIS Hygiene            5 pts max (NEW)
 *   10. Cookie Security                   5 pts max (NEW)
 *   11. CORS Misconfiguration             5 pts max (NEW)
 *   12. Breach Exposure                   5 pts max (NEW)
 *
 * Total theoretical maximum deduction across all 12 categories: 110 points.
 * Final score = clamp(100 - totalDeducted, 0, 100).
 *
 * Epistemic safety principles:
 * - Failed, pending, or incomplete check categories NEVER deduct points.
 * - Missing or unknown data fields never deduct points (unknown is not absent).
 * - Soft signals (WHOIS age, WHOIS privacy) are weighted lightly (<= 3 pts) and
 *   explicitly labeled as soft signals in observations.
 * - Confirmed vulnerabilities (subdomain takeover) carry substantial weight (15 pts).
 * - Single source of truth: computeExposureScore() delegates directly to computeScoreBreakdown().
 *
 * Scoring Version: 2
 */

import type { DomainScan, DimensionScore, ScoreBreakdown, ScoreObservation } from '../../../shared/types';
import type { CookieObservation } from './httpFingerprint';
import type { TakeoverMatch } from './takeoverCheck';

export const SCORING_VERSION = 2 as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseExpiryDays(value: string | undefined | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function parseAgeDays(value: string | undefined | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function buildDimension(
  label: string,
  maxDeduction: number,
  observations: ScoreObservation[],
): DimensionScore {
  const deducted = Math.min(
    maxDeduction,
    observations.reduce((sum, observation) => sum + observation.pointsDeducted, 0),
  );
  return { label, maxDeduction, deducted, observations: observations.slice() };
}

const RISKY_PORTS = new Set([
  21, 23, 445, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8086, 9200, 27017,
]);

function getMissingHeaders(scan: DomainScan): string[] {
  const httpCat = scan.categories.http;
  if (httpCat?.status !== 'completed') return [];

  const http = httpCat.data as {
    https?: { missingSecurityHeaders?: string[] };
    worryingHeaders?: string[];
  } | undefined;

  return http?.https?.missingSecurityHeaders ?? http?.worryingHeaders ?? [];
}

// ── 1. TLS Hygiene (Max: 20) ────────────────────────────────────────────────
function collectTlsObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.tls;
  if (cat?.status !== 'completed') return [];

  const tls = cat.data as {
    available?: boolean;
    outcome?: 'confirmed_absent' | 'connection_failed' | 'available';
    reason?: string;
    validTo?: string | null;
    protocol?: string;
    authorized?: boolean;
    authorizationError?: string;
  } | undefined;

  const observations: ScoreObservation[] = [];

  // Phase 7.1: Connection failures (timeouts, network errors) are inconclusive and must never deduct
  if (tls?.outcome === 'connection_failed') {
    return observations;
  }

  // Only deduct when definitively confirmed absent (e.g. connection refused on port 443)
  if (tls?.outcome === 'confirmed_absent' || (tls?.available === false && tls?.reason?.toLowerCase().includes('refused'))) {
    observations.push({
      description: 'TLS/HTTPS service was not observed on port 443 (connection refused)',
      pointsDeducted: 5,
    });
    return observations;
  }

  if (tls?.available !== true) return observations;

  if (tls.authorized === false) {
    observations.push({
      description: 'TLS certificate was not authorized by the client trust store',
      pointsDeducted: 4,
    });
  }

  const days = parseExpiryDays(tls.validTo);
  if (days !== null) {
    if (days <= 7) {
      observations.push({
        description: `TLS certificate expires in ${days} day${days === 1 ? '' : 's'}`,
        pointsDeducted: 3,
      });
    } else if (days <= 30) {
      observations.push({
        description: `TLS certificate expires in ${days} days`,
        pointsDeducted: 1,
      });
    }
  }

  if (tls.protocol && !['TLSv1.2', 'TLSv1.3'].includes(tls.protocol)) {
    observations.push({
      description: `Observed legacy TLS protocol: ${tls.protocol}`,
      pointsDeducted: 4,
    });
  }

  return observations;
}

// ── 2. HTTPS Enforcement (Max: 15) ──────────────────────────────────────────
function collectHttpsObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.http;
  if (cat?.status !== 'completed') return [];

  const http = cat.data as {
    httpsEnforced?: boolean;
    httpOutcome?: 'completed' | 'confirmed_absent' | 'inconclusive';
    httpAvailable?: boolean;
  } | undefined;
  const observations: ScoreObservation[] = [];

  // Phase 7.1b: Inconclusive check must never deduct for unenforced HTTPS
  if (http?.httpsEnforced === false && http?.httpOutcome !== 'inconclusive' && http?.httpAvailable !== false) {
    observations.push({
      description: 'HTTP requests are not redirected to HTTPS',
      pointsDeducted: 5,
    });
  }

  const missing = getMissingHeaders(scan).map((h) => h.toLowerCase());
  const hasHsts = !missing.some((h) => h === 'strict-transport-security' || h === 'hsts');
  if (missing.length > 0 && !hasHsts) {
    observations.push({
      description: 'Strict-Transport-Security (HSTS) was not observed',
      pointsDeducted: 4,
    });
  }

  return observations;
}

// ── 3. Web Security Headers (Max: 15) ───────────────────────────────────────
function collectHeaderObservations(scan: DomainScan): ScoreObservation[] {
  const missing = getMissingHeaders(scan);
  if (missing.length === 0) return [];

  const observations: ScoreObservation[] = [];
  const normalized = new Set(missing.map((h) => h.toLowerCase()));

  // HSTS belongs to HTTPS Enforcement, excluded here
  if (normalized.has('content-security-policy') || normalized.has('csp')) {
    observations.push({ description: 'Content-Security-Policy is missing', pointsDeducted: 5 });
  }
  if (normalized.has('x-content-type-options') || normalized.has('x-content-type')) {
    observations.push({ description: 'X-Content-Type-Options is missing', pointsDeducted: 3 });
  }
  if (normalized.has('x-frame-options') || normalized.has('x-frame')) {
    observations.push({ description: 'X-Frame-Options or equivalent framing control is missing', pointsDeducted: 3 });
  }
  if (normalized.has('referrer-policy')) {
    observations.push({ description: 'Referrer-Policy is missing', pointsDeducted: 2 });
  }
  if (normalized.has('permissions-policy')) {
    observations.push({ description: 'Permissions-Policy is missing', pointsDeducted: 2 });
  }

  const known = new Set([
    'strict-transport-security', 'hsts', 'content-security-policy', 'csp',
    'x-content-type-options', 'x-content-type', 'x-frame-options', 'x-frame',
    'referrer-policy', 'permissions-policy',
  ]);
  const otherHeaders = missing.filter((h) => !known.has(h.toLowerCase()));
  for (let i = 0; i < Math.min(otherHeaders.length, 5); i += 1) {
    observations.push({
      description: `Additional HTTP security header is missing: ${otherHeaders[i]}`,
      pointsDeducted: 1,
    });
  }

  return observations;
}

// ── 4. Email Security (Max: 10) ─────────────────────────────────────────────
function collectEmailObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.dns;
  if (cat?.status !== 'completed') return [];

  const dns = cat.data as {
    mx?: unknown[];
    spf?: { present?: boolean; policy?: string };
    dmarc?: { present?: boolean; policy?: string };
  } | undefined;

  const observations: ScoreObservation[] = [];

  if (dns?.spf) {
    if (!dns.spf.present) {
      observations.push({ description: 'No SPF record observed in DNS', pointsDeducted: 4 });
    } else if (dns.spf.policy) {
      const policy = dns.spf.policy.toLowerCase();
      if (policy.includes('+all')) {
        observations.push({ description: 'SPF uses the permissive +all policy', pointsDeducted: 4 });
      } else if (policy.includes('?all')) {
        observations.push({ description: 'SPF uses a neutral ?all policy', pointsDeducted: 2 });
      } else if (policy.includes('~all')) {
        observations.push({ description: 'SPF uses a softfail ~all policy', pointsDeducted: 1 });
      }
    }
  }

  if (dns?.dmarc) {
    if (!dns.dmarc.present) {
      observations.push({ description: 'No DMARC record observed in DNS', pointsDeducted: 4 });
    } else {
      const policy = dns.dmarc.policy?.toLowerCase();
      if (policy === 'none') {
        observations.push({ description: 'DMARC policy is set to p=none', pointsDeducted: 3 });
      } else if (policy === 'quarantine') {
        observations.push({ description: 'DMARC policy is set to p=quarantine rather than reject', pointsDeducted: 1 });
      }
    }
  }

  if (Array.isArray(dns?.mx) && dns.mx.length === 0) {
    observations.push({
      description: 'No MX records were observed; verify that this domain does not require inbound email',
      pointsDeducted: 1,
    });
  }

  return observations;
}

// ── 5. DNSSEC Hygiene (Max: 3) ──────────────────────────────────────────────
function collectDnssecObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.dns;
  if (cat?.status !== 'completed') return [];

  const dns = cat.data as {
    dnssec?: { observed?: boolean };
  } | undefined;

  const observations: ScoreObservation[] = [];

  if (dns?.dnssec?.observed === false) {
    observations.push({
      description: 'No DNSSEC (DNSKEY/DS) cryptographic records were observed in DNS',
      pointsDeducted: 3,
    });
  }

  return observations;
}

// ── 6. Network Exposure (Max: 15) ───────────────────────────────────────────
function collectExposureObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.exposure;
  if (cat?.status !== 'completed') return [];

  const exposure = cat.data as {
    shodan?: Array<{ ports?: number[]; vulns?: string[] }>;
  } | undefined;
  if (!Array.isArray(exposure?.shodan)) return [];

  let riskyHostCount = 0;
  let vulnerabilityHostCount = 0;
  const vulnerabilityIds = new Set<string>();

  for (const host of exposure.shodan) {
    if (host.ports?.some((port) => RISKY_PORTS.has(port))) riskyHostCount += 1;
    for (const vuln of host.vulns ?? []) vulnerabilityIds.add(vuln);
    if ((host.vulns?.length ?? 0) > 0) vulnerabilityHostCount += 1;
  }

  const observations: ScoreObservation[] = [];

  if (riskyHostCount > 0) {
    observations.push({
      description: `Potentially risky database/management ports observed on ${riskyHostCount} public host${riskyHostCount === 1 ? '' : 's'}`,
      pointsDeducted: 5,
    });
  }

  if (vulnerabilityIds.size > 0) {
    observations.push({
      description: `${vulnerabilityIds.size} distinct CVE identifier${vulnerabilityIds.size === 1 ? '' : 's'} observed in passive exposure data`,
      pointsDeducted: 5,
    });
  }

  if (riskyHostCount + vulnerabilityHostCount >= 3) {
    observations.push({
      description: 'Exposure signals were observed across multiple public hosts',
      pointsDeducted: 3,
    });
  }

  return observations;
}

// ── 7. Certificate Chain Correctness (Max: 7) ───────────────────────────────
function collectCertificateChainObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.tls;
  if (cat?.status !== 'completed') return [];

  const tls = cat.data as {
    available?: boolean;
    subjectAltNames?: string[];
    hostnameMismatch?: boolean;
    chainComplete?: boolean;
    hasIntermediateCertificate?: boolean;
    chainLength?: number;
  } | undefined;

  if (tls?.available !== true) return [];

  const observations: ScoreObservation[] = [];

  // Check hostname mismatch against SANs
  let isMismatch = tls.hostnameMismatch === true;
  if (tls.hostnameMismatch === undefined && Array.isArray(tls.subjectAltNames) && tls.subjectAltNames.length > 0) {
    const target = scan.domain.toLowerCase().replace(/\.$/, '');
    const matches = tls.subjectAltNames.some((san) => {
      const normalized = san.toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
      return normalized === target || (san.startsWith('*.') && target.endsWith(`.${normalized}`));
    });
    if (!matches) isMismatch = true;
  }

  if (isMismatch) {
    observations.push({
      description: 'TLS certificate Subject Alternative Names do not cover the target domain (hostname mismatch)',
      pointsDeducted: 5,
    });
  }

  // Check certificate chain completeness
  if (tls.chainComplete === false || (tls.hasIntermediateCertificate === false && (tls.chainLength ?? 1) <= 1)) {
    observations.push({
      description: 'TLS certificate chain is incomplete (intermediate CA certificate not served by host)',
      pointsDeducted: 2,
    });
  }

  return observations;
}

// ── 8. Subdomain Takeover Risk (Max: 15) ─────────────────────────────────────
function collectSubdomainTakeoverObservations(scan: DomainScan): ScoreObservation[] {
  const subCat = scan.categories.subdomains;
  const expCat = scan.categories.exposure;

  // Check if check completed
  if (subCat?.status !== 'completed' && expCat?.status !== 'completed') {
    return [];
  }

  const subData = subCat?.data as { takeoverRisks?: TakeoverMatch[] } | undefined;
  const expData = expCat?.data as { takeoverRisks?: TakeoverMatch[] } | undefined;
  const takeovers: TakeoverMatch[] = subData?.takeoverRisks ?? expData?.takeoverRisks ?? [];

  if (!Array.isArray(takeovers) || takeovers.length === 0) {
    return [];
  }

  const confirmed = takeovers.filter((t) => t.confirmed);
  if (confirmed.length === 0) return [];

  const first = confirmed[0];
  if (!first) return [];
  return [
    {
      description: `Confirmed subdomain takeover risk: dangling CNAME pointing to unclaimed ${first.service} resource (${first.subdomain} -> ${first.cname})`,
      pointsDeducted: 15,
    },
  ];
}

// ── 9. Domain & WHOIS Hygiene (Max: 5) ──────────────────────────────────────
function collectWhoisObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.whois;
  if (cat?.status !== 'completed') return [];

  const whois = cat.data as {
    available?: boolean;
    creationDate?: string | null;
    privacyStatus?: 'public' | 'redacted' | 'unknown';
  } | undefined;

  if (whois?.available === false || !whois) return [];

  const observations: ScoreObservation[] = [];

  // Check (a): Domain registered very recently (< 30 days)
  const ageDays = parseAgeDays(whois.creationDate);
  if (ageDays !== null && ageDays >= 0 && ageDays < 30) {
    observations.push({
      description: `Domain was registered very recently (${ageDays} day${ageDays === 1 ? '' : 's'} ago; soft signal on its own, not a confirmed issue)`,
      pointsDeducted: 2,
    });
  }

  // Check (b): Registrant contact info public without privacy/redaction
  if (whois.privacyStatus === 'public') {
    observations.push({
      description: 'Registrant contact details are publicly visible without privacy proxy or redaction (soft signal on its own, not a confirmed issue)',
      pointsDeducted: 3,
    });
  }

  return observations;
}

// ── 10. Cookie Security (Max: 5) ────────────────────────────────────────────
function collectCookieObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.http;
  if (cat?.status !== 'completed') return [];

  const http = cat.data as {
    cookies?: CookieObservation[];
    https?: { cookies?: CookieObservation[] };
    http?: { cookies?: CookieObservation[] };
  } | undefined;

  const cookies: CookieObservation[] = [
    ...(http?.cookies ?? []),
    ...(http?.https?.cookies ?? []),
    ...(http?.http?.cookies ?? []),
  ];

  if (cookies.length === 0) return [];

  const observations: ScoreObservation[] = [];
  const seenNames = new Set<string>();

  for (const cookie of cookies) {
    if (!cookie.isSessionLikely || seenNames.has(cookie.name)) continue;
    seenNames.add(cookie.name);

    if (!cookie.hasSecure) {
      observations.push({
        description: `Sensitive session cookie "${cookie.name}" is missing the Secure flag (heuristic session detection)`,
        pointsDeducted: 2,
      });
    }

    if (!cookie.hasHttpOnly) {
      observations.push({
        description: `Sensitive session cookie "${cookie.name}" is missing the HttpOnly flag (heuristic session detection)`,
        pointsDeducted: 2,
      });
    }

    if (!cookie.sameSite) {
      observations.push({
        description: `Sensitive session cookie "${cookie.name}" is missing the SameSite attribute`,
        pointsDeducted: 1,
      });
    }
  }

  return observations;
}

// ── 11. CORS Misconfiguration (Max: 5) ──────────────────────────────────────
function collectCorsObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.http;
  if (cat?.status !== 'completed') return [];

  const http = cat.data as {
    corsMisconfiguration?: boolean;
    https?: { corsMisconfiguration?: boolean; headers?: Record<string, string> };
    http?: { corsMisconfiguration?: boolean; headers?: Record<string, string> };
  } | undefined;

  let isMisconfigured = Boolean(
    http?.corsMisconfiguration ||
    http?.https?.corsMisconfiguration ||
    http?.http?.corsMisconfiguration,
  );

  if (!isMisconfigured) {
    const headersToCheck = [http?.https?.headers, http?.http?.headers];
    for (const h of headersToCheck) {
      if (h) {
        const origin = (h['access-control-allow-origin'] || '').trim().toLowerCase();
        const creds = (h['access-control-allow-credentials'] || '').trim().toLowerCase();
        if (origin === '*' && creds === 'true') {
          isMisconfigured = true;
          break;
        }
      }
    }
  }

  if (isMisconfigured) {
    return [
      {
        description: 'Risky CORS combination: Access-Control-Allow-Origin wildcard (*) combined with Access-Control-Allow-Credentials: true',
        pointsDeducted: 5,
      },
    ];
  }

  return [];
}

// ── 12. Breach Exposure (Max: 5) ────────────────────────────────────────────
function collectBreachObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.exposure;
  if (cat?.status !== 'completed') return [];

  const expData = cat.data as {
    breachData?: {
      breaches?: Array<{ name: string; title: string }>;
    };
  } | undefined;

  const breaches = expData?.breachData?.breaches;
  if (Array.isArray(breaches) && breaches.length > 0) {
    return [
      {
        description: `Historical security incident presence: ${breaches.length} historical public breach record(s) catalogued for domain (context signal)`,
        pointsDeducted: 5,
      },
    ];
  }

  return [];
}

// ── Score Breakdown Calculation ─────────────────────────────────────────────
export function computeScoreBreakdown(scan: DomainScan): ScoreBreakdown {
  const tlsDim = buildDimension('TLS Hygiene', 20, collectTlsObservations(scan));
  const httpsDim = buildDimension('HTTPS Enforcement', 15, collectHttpsObservations(scan));
  const headersDim = buildDimension('Web Security Headers', 15, collectHeaderObservations(scan));
  const emailDim = buildDimension('Email Security', 10, collectEmailObservations(scan));
  const dnssecDim = buildDimension('DNSSEC Hygiene', 3, collectDnssecObservations(scan));
  const exposureDim = buildDimension('Network Exposure', 15, collectExposureObservations(scan));
  const certChainDim = buildDimension('Certificate Chain Correctness', 7, collectCertificateChainObservations(scan));
  const takeoverDim = buildDimension('Subdomain Takeover Risk', 15, collectSubdomainTakeoverObservations(scan));
  const whoisDim = buildDimension('Domain & WHOIS Hygiene', 5, collectWhoisObservations(scan));
  const cookieDim = buildDimension('Cookie Security', 5, collectCookieObservations(scan));
  const corsDim = buildDimension('CORS Misconfiguration', 5, collectCorsObservations(scan));
  const breachDim = buildDimension('Breach Exposure', 5, collectBreachObservations(scan));

  const totalDeducted =
    tlsDim.deducted +
    httpsDim.deducted +
    headersDim.deducted +
    emailDim.deducted +
    dnssecDim.deducted +
    exposureDim.deducted +
    certChainDim.deducted +
    takeoverDim.deducted +
    whoisDim.deducted +
    cookieDim.deducted +
    corsDim.deducted +
    breachDim.deducted;

  const total = clamp(100 - totalDeducted, 0, 100);

  return {
    scoringVersion: SCORING_VERSION,
    total,
    totalDeducted,
    dimensions: {
      tlsHygiene: tlsDim,
      httpsEnforcement: httpsDim,
      webSecurityHeaders: headersDim,
      emailSecurity: emailDim,
      dnssecHygiene: dnssecDim,
      networkExposure: exposureDim,
      certificateChain: certChainDim,
      subdomainTakeover: takeoverDim,
      whoisHygiene: whoisDim,
      cookieSecurity: cookieDim,
      corsConfiguration: corsDim,
      breachExposure: breachDim,
    },
  };
}

export function computeExposureScore(scan: DomainScan): number {
  return computeScoreBreakdown(scan).total;
}
