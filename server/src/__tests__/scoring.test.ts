import { computeExposureScore, computeScoreBreakdown } from '../services/scoring';
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
        },
      },
      whois: { status: 'completed' },
      subdomains: { status: 'completed' },
      exposure: { status: 'completed' },
      scoring: { status: 'completed' },
    },
  });

  it('computes 100 for a perfectly configured domain with 0 deductions', () => {
    const scan = createBaseScan();
    const score = computeExposureScore(scan);
    const breakdown = computeScoreBreakdown(scan);

    expect(score).toBe(100);
    expect(breakdown.total).toBe(100);
    expect(breakdown.totalDeducted).toBe(0);
    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(0);
    expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(0);
    expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(0);
    expect(breakdown.dimensions.emailSecurity.deducted).toBe(0);
  });

  it('deducts points transparently and matches overall score', () => {
    const scan = createBaseScan();
    // Simulate missing headers (-10), no SPF (-5), no DMARC (-5)
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
  });

  it('deducts 25 when TLS service is unavailable', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).available = false;

    const breakdown = computeScoreBreakdown(scan);
    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(25);
  });
});
