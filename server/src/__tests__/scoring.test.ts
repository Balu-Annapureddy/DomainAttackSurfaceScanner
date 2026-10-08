import { computeExposureScore, computeScoreBreakdown, SCORING_VERSION } from '../services/scoring';
import type { DomainScan } from '../../../shared/types';

describe('External Hygiene Score v2', () => {
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
          authorized: true,
          validTo: new Date(Date.now() + 90 * 86400000).toISOString(),
          protocol: 'TLSv1.3',
          subjectAltNames: ['example.com'],
        },
      },
      http: {
        status: 'completed',
        data: {
          httpsEnforced: true,
          https: { missingSecurityHeaders: [] },
        },
      },
      dns: {
        status: 'completed',
        data: {
          addresses: ['93.184.216.34'],
          mx: ['mail.example.com (10)'],
          ns: ['ns1.example.com', 'ns2.example.com'],
          txt: ['v=spf1 -all'],
          cname: [],
          spf: { present: true, policy: 'v=spf1 -all' },
          dmarc: { present: true, policy: 'reject', record: 'v=DMARC1; p=reject' },
          dnssec: { observed: true },
        },
      },
      whois: { status: 'completed' },
      subdomains: { status: 'completed' },
      exposure: { status: 'completed', data: { shodan: [] } },
      scoring: { status: 'completed' },
    },
  });

  it('returns 100 for a fully evidenced strong posture', () => {
    const scan = createBaseScan();
    const breakdown = computeScoreBreakdown(scan);

    expect(computeExposureScore(scan)).toBe(100);
    expect(breakdown.scoringVersion).toBe(SCORING_VERSION);
    expect(breakdown.totalDeducted).toBe(0);
    expect(Object.values(breakdown.dimensions).reduce((n, d) => n + d.maxDeduction, 0)).toBe(100);
  });

  it('uses nuanced partial deductions instead of the old coarse 20/25-point penalties', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).https.missingSecurityHeaders = [
      'content-security-policy',
    ];
    (scan.categories.dns.data as any).spf = { present: false };
    (scan.categories.dns.data as any).dmarc = { present: false };

    const breakdown = computeScoreBreakdown(scan);

    // CSP -5, SPF -4, DMARC -4 => 13 total, score 87.
    expect(breakdown.totalDeducted).toBe(13);
    expect(breakdown.total).toBe(87);
    expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(5);
    expect(breakdown.dimensions.emailSecurity.deducted).toBe(8);
  });

  it('does not double-count HSTS as both transport and headers', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).https.missingSecurityHeaders = [
      'strict-transport-security',
      'content-security-policy',
    ];

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(4);
    expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(5);
    expect(breakdown.totalDeducted).toBe(9);
    expect(breakdown.total).toBe(91);
  });

  it('deducts only 5 for HTTP without HTTPS enforcement', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).httpsEnforced = false;

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(5);
    expect(breakdown.total).toBe(95);
  });

  it('handles TLS certificate expiry proportionally', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).validTo =
      new Date(Date.now() + 20 * 86400000).toISOString();

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(1);
    expect(breakdown.total).toBe(99);
  });

  it('scores invalid certificate authorization without treating it as TLS absence', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).authorized = false;

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(4);
    expect(breakdown.total).toBe(96);
  });

  it('scores legacy TLS protocol when the protocol is actually observed', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).protocol = 'TLSv1.1';

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(4);
  });

  it('scores DNSSEC, nameserver redundancy, and DNS observations in the DNS dimension', () => {
    const scan = createBaseScan();
    (scan.categories.dns.data as any).dnssec = { observed: false };
    (scan.categories.dns.data as any).ns = ['ns1.example.com'];
    (scan.categories.dns.data as any).addresses = [];

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.dnssecHygiene.deducted).toBe(8);
    expect(breakdown.total).toBe(92);
  });

  it('distinguishes SPF and DMARC policy strength', () => {
    const scan = createBaseScan();
    (scan.categories.dns.data as any).spf = { present: true, policy: 'v=spf1 +all' };
    (scan.categories.dns.data as any).dmarc = { present: true, policy: 'none' };

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.emailSecurity.deducted).toBe(7);
    expect(breakdown.total).toBe(93);
  });

  it('deduplicates CVEs and bounds exposure deductions', () => {
    const scan = createBaseScan();
    (scan.categories.exposure.data as any).shodan = [
      { ports: [80, 3306], vulns: ['CVE-2024-1234', 'CVE-2024-1234'] },
      { ports: [3389], vulns: ['CVE-2024-1234'] },
    ];

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.networkExposure.deducted).toBe(13);
    expect(breakdown.dimensions.networkExposure.observations).toHaveLength(3);
    expect(breakdown.total).toBe(87);
  });

  it('never deducts from failed or incomplete categories', () => {
    const scan = createBaseScan();
    scan.categories.tls = {
      status: 'failed',
      data: { available: false, authorized: false, protocol: 'TLSv1.1' },
    };
    scan.categories.http = {
      status: 'failed',
      data: {
        httpsEnforced: false,
        https: { missingSecurityHeaders: ['hsts', 'csp', 'x-frame-options'] },
      },
    };
    scan.categories.dns = {
      status: 'pending',
      data: {
        spf: { present: false },
        dmarc: { present: false },
        dnssec: { observed: false },
        ns: [],
      },
    };
    scan.categories.exposure = {
      status: 'failed',
      data: { shodan: [{ ports: [3306], vulns: ['CVE-2024-1234'] }] },
    };

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.total).toBe(100);
    expect(breakdown.totalDeducted).toBe(0);
  });

  it('does not penalize unknown CAA or DKIM status because those signals are not collected', () => {
    const scan = createBaseScan();
    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.dnssecHygiene.deducted).toBe(0);
    expect(breakdown.dimensions.emailSecurity.deducted).toBe(0);
  });

  it('keeps computeExposureScore and the detailed breakdown identical', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).httpsEnforced = false;
    (scan.categories.dns.data as any).dnssec = { observed: false };

    expect(computeExposureScore(scan)).toBe(computeScoreBreakdown(scan).total);
  });

  it('clamps the score to the 0–100 range', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).available = false;
    (scan.categories.tls.data as any).authorized = false;
    (scan.categories.tls.data as any).validTo =
      new Date(Date.now() - 2 * 86400000).toISOString();
    (scan.categories.http.data as any).httpsEnforced = false;
    (scan.categories.http.data as any).https.missingSecurityHeaders = [
      'strict-transport-security',
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'permissions-policy',
      'other-header',
    ];
    (scan.categories.dns.data as any).spf = { present: false };
    (scan.categories.dns.data as any).dmarc = { present: false };
    (scan.categories.dns.data as any).dnssec = { observed: false };
    (scan.categories.dns.data as any).ns = ['ns1.example.com'];
    (scan.categories.dns.data as any).addresses = [];
    (scan.categories.exposure.data as any).shodan = [
      { ports: [21, 3306], vulns: ['CVE-1', 'CVE-2'] },
      { ports: [3389], vulns: ['CVE-3'] },
      { ports: [23], vulns: [] },
    ];

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(100);
    expect(breakdown.totalDeducted).toBeLessThanOrEqual(100);
  });
});
