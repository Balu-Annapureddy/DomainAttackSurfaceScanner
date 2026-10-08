/**
 * External Hygiene Score — v2 weighted hygiene model
 *
 * The score is a deterministic 0–100 configuration-hygiene summary based only
 * on completed, evidence-backed observations. It is NOT an exploitability score.
 *
 * Model:
 *   TLS & Certificate       20
 *   HTTPS & Transport       15
 *   HTTP Security Headers   20
 *   DNS & Domain Integrity  15
 *   Email Security          15
 *   Internet Exposure       15
 *
 * Total possible deduction = 100, so a perfect posture remains 100 while
 * partial weaknesses produce proportional deductions instead of the old
 * coarse 20/25-point penalties.
 *
 * Epistemic safety:
 * - failed/pending categories never deduct;
 * - unknown/unavailable fields never deduct;
 * - HSTS is scored in HTTPS & Transport and is excluded from header scoring;
 * - exposure signals are deduplicated and bounded.
 *
 * Scoring Version: 2
 */

import type { DomainScan, DimensionScore, ScoreBreakdown, ScoreObservation } from '../../../shared/types';

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

function collectTlsObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.tls;
  if (cat?.status !== 'completed') return [];

  const tls = cat.data as {
    available?: boolean;
    validTo?: string | null;
    protocol?: string;
    authorized?: boolean;
    authorizationError?: string;
    subjectAltNames?: string[];
  } | undefined;

  const observations: ScoreObservation[] = [];

  if (tls?.available === false) {
    observations.push({
      description: 'TLS/HTTPS service was not observed on port 443',
      pointsDeducted: 5,
    });
    return observations;
  }

  if (tls?.available !== true) return observations;

  if (tls.authorized === false) {
    observations.push({
      description: 'TLS certificate chain was not authorized by the client trust store',
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

  // If the scanner supplied SANs, require the target hostname to be represented.
  // Do not penalize when SAN data is unavailable.
  if (Array.isArray(tls.subjectAltNames) && tls.subjectAltNames.length > 0) {
    const target = scan.domain.toLowerCase().replace(/\.$/, '');
    const matches = tls.subjectAltNames.some((san) => {
      const normalized = san.toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
      return normalized === target || (san.startsWith('*.') && target.endsWith(`.${normalized}`));
    });
    if (!matches) {
      observations.push({
        description: 'TLS certificate SANs do not include the scanned hostname',
        pointsDeducted: 4,
      });
    }
  }

  return observations;
}

function collectHttpsObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.http;
  if (cat?.status !== 'completed') return [];

  const http = cat.data as { httpsEnforced?: boolean } | undefined;
  const observations: ScoreObservation[] = [];

  if (http?.httpsEnforced === false) {
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

function collectHeaderObservations(scan: DomainScan): ScoreObservation[] {
  const missing = getMissingHeaders(scan);
  if (missing.length === 0) return [];

  const observations: ScoreObservation[] = [];
  const normalized = new Set(missing.map((h) => h.toLowerCase()));

  // HSTS belongs to HTTPS & Transport, so it is intentionally excluded here.
  if (normalized.has('content-security-policy') || normalized.has('csp')) {
    observations.push({ description: 'Content-Security-Policy is missing', pointsDeducted: 5 });
  }
  if (normalized.has('x-content-type-options') || normalized.has('x-content-type')) {
    observations.push({ description: 'X-Content-Type-Options is missing', pointsDeducted: 3 });
  }
  if (normalized.has('x-frame-options') || normalized.has('x-frame')) {
    observations.push({ description: 'X-Frame-Options or an equivalent framing control is missing', pointsDeducted: 3 });
  }
  if (normalized.has('referrer-policy')) {
    observations.push({ description: 'Referrer-Policy is missing', pointsDeducted: 2 });
  }
  if (normalized.has('permissions-policy')) {
    observations.push({ description: 'Permissions-Policy is missing', pointsDeducted: 2 });
  }

  // Other explicitly reported missing security headers receive a small bounded
  // deduction rather than all being treated as equally critical.
  const known = new Set([
    'strict-transport-security', 'hsts', 'content-security-policy', 'csp',
    'x-content-type-options', 'x-content-type', 'x-frame-options', 'x-frame',
    'referrer-policy', 'permissions-policy',
  ]);
  const otherCount = missing.filter((h) => !known.has(h.toLowerCase())).length;
  for (let i = 0; i < Math.min(otherCount, 5); i += 1) {
    observations.push({
      description: `Additional HTTP security header is missing: ${missing.filter((h) => !known.has(h.toLowerCase()))[i]}`,
      pointsDeducted: 1,
    });
  }

  return observations;
}

function collectDnsObservations(scan: DomainScan): ScoreObservation[] {
  const cat = scan.categories.dns;
  if (cat?.status !== 'completed') return [];

  const dns = cat.data as {
    dnssec?: { observed?: boolean };
    ns?: string[];
    addresses?: string[];
    cname?: string[];
    txt?: string[];
  } | undefined;

  const observations: ScoreObservation[] = [];

  if (dns?.dnssec?.observed === false) {
    observations.push({
      description: 'No DNSSEC (DNSKEY/DS) records were observed',
      pointsDeducted: 4,
    });
  }

  if (Array.isArray(dns?.ns) && dns.ns.length === 1) {
    observations.push({
      description: 'Only one authoritative nameserver was observed',
      pointsDeducted: 2,
    });
  }

  // The current DNS collector does not expose CAA as a structured field.
  // Do not infer a missing CAA record from absent data.
  if (Array.isArray(dns?.addresses) && dns.addresses.length === 0 && (dns?.cname?.length ?? 0) === 0) {
    observations.push({
      description: 'No public A/AAAA address or CNAME was observed for the target',
      pointsDeducted: 2,
    });
  }

  if (Array.isArray(dns?.txt) && dns.txt.length > 20) {
    observations.push({
      description: 'Large TXT record surface was observed; review unnecessary public TXT records',
      pointsDeducted: 1,
    });
  }

  return observations;
}

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

export function computeScoreBreakdown(scan: DomainScan): ScoreBreakdown {
  const tlsDim = buildDimension('TLS & Certificate', 20, collectTlsObservations(scan));
  const httpsDim = buildDimension('HTTPS & Transport', 15, collectHttpsObservations(scan));
  const headersDim = buildDimension('HTTP Security Headers', 20, collectHeaderObservations(scan));
  const dnsDim = buildDimension('DNS & Domain Integrity', 15, collectDnsObservations(scan));
  const emailDim = buildDimension('Email Security', 15, collectEmailObservations(scan));
  const exposureDim = buildDimension('Internet Exposure', 15, collectExposureObservations(scan));

  const totalDeducted =
    tlsDim.deducted +
    httpsDim.deducted +
    headersDim.deducted +
    dnsDim.deducted +
    emailDim.deducted +
    exposureDim.deducted;

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
      dnssecHygiene: dnsDim,
      networkExposure: exposureDim,
    },
  };
}

export function computeExposureScore(scan: DomainScan): number {
  return computeScoreBreakdown(scan).total;
}
