/**
 * External Hygiene Score — v1 scoring engine
 *
 * Design principles
 * ─────────────────
 * 1. Single source of truth: `computeScoreBreakdown` collects all observations
 *    in one pass. `computeExposureScore` delegates entirely to it — the two
 *    functions can never silently diverge.
 *
 * 2. Epistemic safety: a check that is pending, running, or failed does NOT
 *    contribute a deduction. Only a category with status === 'completed' is
 *    eligible for scoring. Absence of evidence ≠ evidence of weakness.
 *
 * 3. Deterministic + bounded: every dimension has an explicit maxDeduction cap.
 *    Sum of all caps = 103 (TLS 25 + HTTPS 20 + Headers 25 + Email 10 +
 *    DNSSEC 3 + Exposure 20). The final score is clamped to [0, 100].
 *
 * 4. No double-counting: each signal is recorded in exactly one dimension.
 *
 * Scoring Version: 1
 *
 * Dimension table
 * ───────────────
 * | Dimension            | Max deduction | Notes                              |
 * |----------------------|---------------|------------------------------------|
 * | TLS Hygiene          | 25            | No TLS: −25. Expiring ≤7d: −25.    |
 * |                      |               | Expiring ≤30d: −10.                |
 * | HTTPS Enforcement    | 20            | HTTP not redirecting to HTTPS: −20 |
 * | Web Security Headers | 25            | −5 per missing header, capped at 5 |
 * | Email Security       | 10            | No SPF: −5. No DMARC: −5.         |
 * | DNSSEC Hygiene       |  3            | No DNSKEY/DS records: −3           |
 * | Network Exposure     | 20            | Risky port: −10. Known CVE: −10.  |
 */

import type { DomainScan, DimensionScore, ScoreBreakdown, ScoreObservation } from '../../../shared/types';

/** Current scoring model version. Increment when deduction weights change. */
export const SCORING_VERSION = 1 as const;

// ── Utilities ──────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseExpiryDays(value: string | undefined | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function buildDimension(
  label: string,
  maxDeduction: number,
  observations: ScoreObservation[],
): DimensionScore {
  const deducted = Math.min(maxDeduction, observations.reduce((sum, o) => sum + o.pointsDeducted, 0));
  return { label, maxDeduction, deducted, observations: observations.slice() };
}

// ── Risky ports: publicly-exposed management or database surfaces ───────────
const RISKY_PORTS = new Set([
  21,    // FTP
  23,    // Telnet
  445,   // SMB
  1433,  // MSSQL
  1521,  // Oracle DB
  3306,  // MySQL/MariaDB
  3389,  // RDP
  5432,  // PostgreSQL
  5900,  // VNC
  6379,  // Redis
  8086,  // InfluxDB
  9200,  // Elasticsearch
  27017, // MongoDB
]);

// ── Observation collectors ─────────────────────────────────────────────────

function collectTlsObservations(scan: DomainScan): ScoreObservation[] {
  const tlsCat = scan.categories.tls;
  if (tlsCat?.status !== 'completed') return []; // epistemic safety

  const tls = tlsCat.data as { available?: boolean; validTo?: string | null } | undefined;

  if (tls?.available === false) {
    return [{ description: 'No TLS/HTTPS service observed on port 443', pointsDeducted: 25 }];
  }

  if (tls?.available === true) {
    const days = parseExpiryDays(tls.validTo ?? null);
    if (days !== null && days <= 7) {
      return [{
        description: `TLS certificate expires in ${days} day${days === 1 ? '' : 's'} — immediate renewal required`,
        pointsDeducted: 25,
      }];
    }
    if (days !== null && days <= 30) {
      return [{
        description: `TLS certificate expires in ${days} day${days === 1 ? '' : 's'}`,
        pointsDeducted: 10,
      }];
    }
  }

  return [];
}

function collectHttpsObservations(scan: DomainScan): ScoreObservation[] {
  const httpCat = scan.categories.http;
  if (httpCat?.status !== 'completed') return []; // epistemic safety

  const http = httpCat.data as { httpsEnforced?: boolean } | undefined;
  if (http?.httpsEnforced === false) {
    return [{ description: 'HTTP requests are not redirected to HTTPS', pointsDeducted: 20 }];
  }
  return [];
}

function collectHeaderObservations(scan: DomainScan): ScoreObservation[] {
  const httpCat = scan.categories.http;
  if (httpCat?.status !== 'completed') return []; // epistemic safety

  const http = httpCat.data as {
    https?: { missingSecurityHeaders?: string[] };
    worryingHeaders?: string[];
  } | undefined;

  // Prefer the structured missingSecurityHeaders list; fall back to worryingHeaders
  const missing = http?.https?.missingSecurityHeaders ?? http?.worryingHeaders ?? [];
  // Cap at 5 headers × 5 pts = 25 (also enforced by buildDimension)
  return missing.slice(0, 5).map((h) => ({
    description: `Missing HTTP security header: ${h}`,
    pointsDeducted: 5,
  }));
}

function collectEmailObservations(scan: DomainScan): ScoreObservation[] {
  const dnsCat = scan.categories.dns;
  if (dnsCat?.status !== 'completed') return []; // epistemic safety

  const dns = dnsCat.data as {
    spf?: { present?: boolean };
    dmarc?: { present?: boolean };
  } | undefined;

  const obs: ScoreObservation[] = [];
  if (dns?.spf && !dns.spf.present) {
    obs.push({ description: 'No SPF record observed in DNS', pointsDeducted: 5 });
  }
  if (dns?.dmarc && !dns.dmarc.present) {
    obs.push({ description: 'No DMARC record observed in DNS', pointsDeducted: 5 });
  }
  return obs;
}

function collectDnssecObservations(scan: DomainScan): ScoreObservation[] {
  const dnsCat = scan.categories.dns;
  if (dnsCat?.status !== 'completed') return []; // epistemic safety

  const dns = dnsCat.data as { dnssec?: { observed?: boolean } } | undefined;
  if (dns?.dnssec?.observed === false) {
    return [{ description: 'No DNSSEC (DNSKEY/DS) records observed in DNS', pointsDeducted: 3 }];
  }
  return [];
}

function collectExposureObservations(scan: DomainScan): ScoreObservation[] {
  const expCat = scan.categories.exposure;
  if (expCat?.status !== 'completed') return []; // epistemic safety

  const exposure = expCat.data as { shodan?: Array<{ ports?: number[]; vulns?: string[] }> } | undefined;
  if (!exposure?.shodan) return [];

  let hasRiskyPort = false;
  let hasVuln = false;

  for (const host of exposure.shodan) {
    if (host.ports?.some((p) => RISKY_PORTS.has(p))) hasRiskyPort = true;
    if (host.vulns && host.vulns.length > 0) hasVuln = true;
  }

  const obs: ScoreObservation[] = [];
  if (hasRiskyPort) {
    obs.push({
      description: 'Potentially risky database or remote management service port exposed to public internet',
      pointsDeducted: 10,
    });
  }
  if (hasVuln) {
    obs.push({
      description: 'Host running software version with confirmed CVE vulnerability in Shodan records',
      pointsDeducted: 10,
    });
  }
  return obs;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the full per-dimension score breakdown.
 *
 * This is the single authoritative implementation. `computeExposureScore`
 * derives its result from this function to guarantee they never diverge.
 */
export function computeScoreBreakdown(scan: DomainScan): ScoreBreakdown {
  const tlsDim      = buildDimension('TLS Hygiene',          25, collectTlsObservations(scan));
  const httpsDim    = buildDimension('HTTPS Enforcement',    20, collectHttpsObservations(scan));
  const headersDim  = buildDimension('Web Security Headers', 25, collectHeaderObservations(scan));
  const emailDim    = buildDimension('Email Security',       10, collectEmailObservations(scan));
  const dnssecDim   = buildDimension('DNSSEC Hygiene',        3, collectDnssecObservations(scan));
  const exposureDim = buildDimension('Network Exposure',     20, collectExposureObservations(scan));

  const totalDeducted =
    tlsDim.deducted +
    httpsDim.deducted +
    headersDim.deducted +
    emailDim.deducted +
    dnssecDim.deducted +
    exposureDim.deducted;

  const total = clamp(100 - totalDeducted, 0, 100);

  return {
    scoringVersion: SCORING_VERSION,
    total,
    totalDeducted,
    dimensions: {
      tlsHygiene:         tlsDim,
      httpsEnforcement:   httpsDim,
      webSecurityHeaders: headersDim,
      emailSecurity:      emailDim,
      dnssecHygiene:      dnssecDim,
      networkExposure:    exposureDim,
    },
  };
}

/**
 * Convenience wrapper that returns only the integer score (0–100).
 * Delegates entirely to `computeScoreBreakdown` to guarantee consistency.
 */
export function computeExposureScore(scan: DomainScan): number {
  return computeScoreBreakdown(scan).total;
}
