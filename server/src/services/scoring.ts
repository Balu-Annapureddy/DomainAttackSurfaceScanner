import type { DomainScan, DimensionScore, ScoreBreakdown, ScoreObservation } from '../../../shared/types';

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

function dim(
  label: string,
  maxDeduction: number,
  observations: ScoreObservation[],
): DimensionScore {
  const deducted = Math.min(maxDeduction, observations.reduce((sum, o) => sum + o.pointsDeducted, 0));
  return { label, maxDeduction, deducted, observations };
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
    // DNSSEC missing: modest 3-point deduction. Absence leaves DNS unauthenticated.
    if ((dns as { dnssec?: { observed?: boolean } }).dnssec?.observed === false) {
      score -= 3;
    }
  }

  // 5. Network perimeter exposure & known CVEs (Shodan InternetDB passive records)
  const exposureCategory = scan.categories.exposure;
  const exposure = exposureCategory?.status === 'completed'
    ? (exposureCategory.data as { shodan?: Array<{ ports?: number[]; vulns?: string[] }> } | undefined)
    : undefined;

  if (exposureCategory?.status === 'completed' && exposure?.shodan) {
    const riskyPorts = new Set([21, 23, 445, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8086, 9200, 27017]);
    let hasRiskyPort = false;
    let hasVuln = false;

    for (const host of exposure.shodan) {
      if (host.ports && host.ports.some((p) => riskyPorts.has(p))) hasRiskyPort = true;
      if (host.vulns && host.vulns.length > 0) hasVuln = true;
    }

    // Risky service exposure: 10-point deduction for publicly exposed databases/remote management
    if (hasRiskyPort) {
      score -= 10;
    }
    // Confirmed known CVE: 10-point deduction for documented unpatched vulnerabilities on perimeter
    if (hasVuln) {
      score -= 10;
    }
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Compute a transparent per-dimension breakdown of the hygiene score.
 * The total is identical to computeExposureScore — this function exposes
 * the same algorithm as named dimensions so the user can see exactly
 * why their score is what it is.
 *
 * Dimension max deductions: TLS(25) + HTTPS(20) + Headers(25) + Email(10) + DNSSEC(3) + Exposure(20).
 * A domain with no issues receives a score of 100 (no deductions).
 */
export function computeScoreBreakdown(scan: DomainScan): ScoreBreakdown {
  const tlsCategory = scan.categories.tls;
  const httpCategory = scan.categories.http;
  const dnsCategory = scan.categories.dns;
  const exposureCategory = scan.categories.exposure;

  const tls = tlsCategory?.status === 'completed'
    ? (tlsCategory.data as { available?: boolean; validTo?: string | null } | undefined)
    : undefined;

  const http = httpCategory?.status === 'completed'
    ? (httpCategory.data as {
        https?: { missingSecurityHeaders?: string[] };
        httpsEnforced?: boolean;
        worryingHeaders?: string[];
      } | undefined)
    : undefined;

  const dns = dnsCategory?.status === 'completed'
    ? (dnsCategory.data as {
        spf?: { present?: boolean };
        dmarc?: { present?: boolean };
        dnssec?: { observed?: boolean };
      } | undefined)
    : undefined;

  const exposure = exposureCategory?.status === 'completed'
    ? (exposureCategory.data as { shodan?: Array<{ ports?: number[]; vulns?: string[] }> } | undefined)
    : undefined;

  // ── TLS Hygiene (max deduction: 25) ───────────────────────────────────────
  const tlsObservations: ScoreObservation[] = [];
  if (tlsCategory?.status === 'completed') {
    if (tls?.available === false) {
      tlsObservations.push({ description: 'No TLS/HTTPS service observed on port 443', pointsDeducted: 25 });
    } else if (tls?.available === true) {
      const days = parseExpiryDays(tls.validTo ?? null);
      if (days !== null && days <= 7) {
        tlsObservations.push({ description: `TLS certificate expires in ${days} day${days === 1 ? '' : 's'} — immediate renewal required`, pointsDeducted: 25 });
      } else if (days !== null && days <= 30) {
        tlsObservations.push({ description: `TLS certificate expires in ${days} days`, pointsDeducted: 10 });
      }
    }
  }

  // ── HTTPS Enforcement (max deduction: 20) ─────────────────────────────────
  const httpsObservations: ScoreObservation[] = [];
  if (httpCategory?.status === 'completed' && http?.httpsEnforced === false) {
    httpsObservations.push({ description: 'HTTP requests are not redirected to HTTPS', pointsDeducted: 20 });
  }

  // ── Web Security Headers (max deduction: 25) ──────────────────────────────
  const headerObservations: ScoreObservation[] = [];
  if (httpCategory?.status === 'completed') {
    const missing = http?.https?.missingSecurityHeaders ?? http?.worryingHeaders ?? [];
    const capped = missing.slice(0, 5); // max 5 headers × 5 pts = 25
    for (const h of capped) {
      headerObservations.push({ description: `Missing HTTP security header: ${h}`, pointsDeducted: 5 });
    }
  }

  // ── Email Security (max deduction: 10) ────────────────────────────────────
  const emailObservations: ScoreObservation[] = [];
  if (dnsCategory?.status === 'completed' && dns) {
    if (dns.spf && !dns.spf.present) {
      emailObservations.push({ description: 'No SPF record observed in DNS', pointsDeducted: 5 });
    }
    if (dns.dmarc && !dns.dmarc.present) {
      emailObservations.push({ description: 'No DMARC record observed in DNS', pointsDeducted: 5 });
    }
  }

  // ── DNSSEC Hygiene (max deduction: 3) ─────────────────────────────────────
  const dnssecObservations: ScoreObservation[] = [];
  if (dnsCategory?.status === 'completed' && dns?.dnssec?.observed === false) {
    dnssecObservations.push({ description: 'No DNSSEC (DNSKEY/DS) records observed in DNS', pointsDeducted: 3 });
  }

  // ── Network Exposure (max deduction: 20) ──────────────────────────────────
  const exposureObservations: ScoreObservation[] = [];
  if (exposureCategory?.status === 'completed' && exposure?.shodan) {
    const riskyPorts = new Set([21, 23, 445, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8086, 9200, 27017]);
    let hasRiskyPort = false;
    let hasVuln = false;

    for (const host of exposure.shodan) {
      if (host.ports && host.ports.some((p) => riskyPorts.has(p))) hasRiskyPort = true;
      if (host.vulns && host.vulns.length > 0) hasVuln = true;
    }

    if (hasRiskyPort) {
      exposureObservations.push({
        description: 'Potentially risky database or remote management service port exposed to public internet',
        pointsDeducted: 10,
      });
    }
    if (hasVuln) {
      exposureObservations.push({
        description: 'Host running software version with confirmed CVE vulnerability in Shodan records',
        pointsDeducted: 10,
      });
    }
  }

  const tlsDim = dim('TLS Hygiene', 25, tlsObservations);
  const httpsDim = dim('HTTPS Enforcement', 20, httpsObservations);
  const headersDim = dim('Web Security Headers', 25, headerObservations);
  const emailDim = dim('Email Security', 10, emailObservations);
  const dnssecDim = dim('DNSSEC Hygiene', 3, dnssecObservations);
  const exposureDim = dim('Network Exposure', 20, exposureObservations);

  const totalDeducted =
    tlsDim.deducted +
    httpsDim.deducted +
    headersDim.deducted +
    emailDim.deducted +
    dnssecDim.deducted +
    exposureDim.deducted;
  const total = clamp(100 - totalDeducted, 0, 100);

  return {
    total,
    totalDeducted,
    dimensions: {
      tlsHygiene: tlsDim,
      httpsEnforcement: httpsDim,
      webSecurityHeaders: headersDim,
      emailSecurity: emailDim,
      dnssecHygiene: dnssecDim,
      networkExposure: exposureDim,
    },
  };
}
