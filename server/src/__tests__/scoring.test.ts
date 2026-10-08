import { computeExposureScore, computeScoreBreakdown, SCORING_VERSION } from '../services/scoring';
import type { DomainScan } from '../../../shared/types';

describe('Scoring & Score Breakdown', () => {
  const createBaseScan = (): DomainScan => ({
    scanId: 'test-scan-1',
    domain: 'example.com',
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    status: 'completed',
    assets: [],
    relationships: [],
    findings: [],
    warnings: [],
    categories: {
      tls: {
        status: 'completed',
        data: {
          available: true,
          validTo: new Date(Date.now() + 90 * 86400000).toISOString(),
        },
      },
      http: {
        status: 'completed',
        data: {
          httpsEnforced: true,
          https: {
            missingSecurityHeaders: [],
          },
        },
      },
      dns: {
        status: 'completed',
        data: {
          spf: { present: true },
          dmarc: { present: true },
          dnssec: { observed: true },
        },
      },
      whois: { status: 'completed' },
      subdomains: { status: 'completed' },
      exposure: {
        status: 'completed',
        data: {
          shodan: [],
        },
      },
      scoring: { status: 'completed' },
    },
  });

  it('computes 100 for a perfectly configured domain with 0 deductions', () => {
    const scan = createBaseScan();
    const score = computeExposureScore(scan);
    const breakdown = computeScoreBreakdown(scan);

    expect(score).toBe(100);
    expect(breakdown.scoringVersion).toBe(SCORING_VERSION);
    expect(breakdown.total).toBe(100);
    expect(breakdown.totalDeducted).toBe(0);
    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(0);
    expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(0);
    expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(0);
    expect(breakdown.dimensions.emailSecurity.deducted).toBe(0);
    expect(breakdown.dimensions.dnssecHygiene.deducted).toBe(0);
    expect(breakdown.dimensions.networkExposure.deducted).toBe(0);
  });

  describe('Epistemic Safety Guarantees', () => {
    it('does NOT deduct points when category checks fail or are incomplete', () => {
      const scan = createBaseScan();
      // Set categories to failed or pending with data that would otherwise trigger deductions
      scan.categories.tls = {
        status: 'failed',
        data: { available: false },
        error: 'Connection timeout',
      };
      scan.categories.http = {
        status: 'failed',
        data: { httpsEnforced: false, worryingHeaders: ['hsts', 'csp', 'xfo'] },
        error: 'Network unreachable',
      };
      scan.categories.dns = {
        status: 'pending',
        data: { spf: { present: false }, dmarc: { present: false }, dnssec: { observed: false } },
      };
      scan.categories.exposure = {
        status: 'failed',
        data: { shodan: [{ ports: [3306], vulns: ['CVE-2023-1234'] }] },
      };

      const score = computeExposureScore(scan);
      const breakdown = computeScoreBreakdown(scan);

      // Incomplete or failed categories must never deduct points
      expect(score).toBe(100);
      expect(breakdown.totalDeducted).toBe(0);
      expect(breakdown.dimensions.tlsHygiene.deducted).toBe(0);
      expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(0);
      expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(0);
      expect(breakdown.dimensions.emailSecurity.deducted).toBe(0);
      expect(breakdown.dimensions.dnssecHygiene.deducted).toBe(0);
      expect(breakdown.dimensions.networkExposure.deducted).toBe(0);
    });
  });

  describe('Dimension Deductions & Explanations', () => {
    it('deducts points transparently and matches overall score', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).https.missingSecurityHeaders = [
        'strict-transport-security',
        'content-security-policy',
      ];
      (scan.categories.dns.data as any).spf.present = false;
      (scan.categories.dns.data as any).dmarc.present = false;

      const score = computeExposureScore(scan);
      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.total).toBe(score);
      expect(breakdown.totalDeducted).toBe(20);
      expect(breakdown.total).toBe(80);

      expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(10);
      expect(breakdown.dimensions.webSecurityHeaders.observations).toHaveLength(2);

      expect(breakdown.dimensions.emailSecurity.deducted).toBe(10);
      expect(breakdown.dimensions.emailSecurity.observations).toHaveLength(2);
    });

    it('deducts 20 when HTTPS is not enforced', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).httpsEnforced = false;

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(20);
      expect(breakdown.dimensions.httpsEnforcement.observations[0]?.description).toContain('not redirected to HTTPS');
      expect(computeExposureScore(scan)).toBe(80);
    });

    it('deducts 25 when TLS service is unavailable', () => {
      const scan = createBaseScan();
      (scan.categories.tls.data as any).available = false;

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.dimensions.tlsHygiene.deducted).toBe(25);
      expect(computeExposureScore(scan)).toBe(75);
    });

    it('deducts 25 when TLS certificate expires in 7 days or less', () => {
      const scan = createBaseScan();
      (scan.categories.tls.data as any).validTo = new Date(Date.now() + 5 * 86400000).toISOString();

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.dimensions.tlsHygiene.deducted).toBe(25);
      expect(breakdown.dimensions.tlsHygiene.observations[0]?.description).toContain('immediate renewal required');
    });

    it('deducts 10 when TLS certificate expires between 8 and 30 days', () => {
      const scan = createBaseScan();
      (scan.categories.tls.data as any).validTo = new Date(Date.now() + 20 * 86400000).toISOString();

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.dimensions.tlsHygiene.deducted).toBe(10);
      expect(computeExposureScore(scan)).toBe(90);
    });

    it('caps Web Security Headers deductions at 25 points', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).https.missingSecurityHeaders = [
        'strict-transport-security',
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy',
        'permissions-policy',
        'cross-origin-opener-policy',
      ];

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(25);
      expect(breakdown.dimensions.webSecurityHeaders.observations).toHaveLength(5);
    });

    it('deducts 3 points when DNSSEC is not observed', () => {
      const scan = createBaseScan();
      (scan.categories.dns.data as any).dnssec = { observed: false };

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.dimensions.dnssecHygiene.deducted).toBe(3);
      expect(computeExposureScore(scan)).toBe(97);
    });

    it('deducts 10 points for risky ports and 10 points for known CVEs in exposure', () => {
      const scan = createBaseScan();
      (scan.categories.exposure.data as any).shodan = [
        {
          ports: [80, 443, 3306], // 3306 is MySQL (risky port)
          vulns: ['CVE-2021-34527'],
        },
      ];

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.dimensions.networkExposure.deducted).toBe(20);
      expect(breakdown.dimensions.networkExposure.observations).toHaveLength(2);
      expect(computeExposureScore(scan)).toBe(80);
    });
  });

  describe('Boundary and Clamp Validation', () => {
    it('clamps worst-case maximum deductions to a floor of 0', () => {
      const scan = createBaseScan();
      // Trigger all possible deductions:
      // TLS (-25), HTTPS (-20), Headers (-25), Email (-10), DNSSEC (-3), Exposure (-20) = -103 pts
      (scan.categories.tls.data as any).available = false;
      (scan.categories.http.data as any).httpsEnforced = false;
      (scan.categories.http.data as any).https.missingSecurityHeaders = [
        'hsts', 'csp', 'xcto', 'xfo', 'rp', 'extra',
      ];
      (scan.categories.dns.data as any).spf.present = false;
      (scan.categories.dns.data as any).dmarc.present = false;
      (scan.categories.dns.data as any).dnssec = { observed: false };
      (scan.categories.exposure.data as any).shodan = [
        { ports: [22, 3389], vulns: ['CVE-2023-9999'] },
      ];

      const breakdown = computeScoreBreakdown(scan);
      expect(breakdown.totalDeducted).toBe(103);
      expect(breakdown.total).toBe(0);
      expect(computeExposureScore(scan)).toBe(0);
    });

    it('guarantees computeExposureScore matches computeScoreBreakdown.total in all cases', () => {
      const scan = createBaseScan();
      (scan.categories.tls.data as any).validTo = new Date(Date.now() + 15 * 86400000).toISOString();
      (scan.categories.dns.data as any).spf.present = false;

      expect(computeExposureScore(scan)).toBe(computeScoreBreakdown(scan).total);
    });
  });
});

