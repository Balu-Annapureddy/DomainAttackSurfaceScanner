import { buildFindings } from '../services/findings';
import { computeExposureScore, computeScoreBreakdown } from '../services/scoring';
import type { DomainScan } from '../../../shared/types';

describe('Phase 2 Findings & Scoring Integration', () => {
  const createBaseScan = (): DomainScan => ({
    scanId: 'test-scan-phase2',
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
          dnssec: { observed: true, note: 'DNSSEC records observed' },
        },
      },
      whois: { status: 'completed' },
      subdomains: { status: 'completed' },
      exposure: {
        status: 'completed',
        data: {
          checks: [
            { path: '/robots.txt', status: 200, present: true },
            { path: '/sitemap.xml', status: 200, present: true },
            { path: '/.well-known/security.txt', status: 200, present: true },
          ],
          shodan: [],
        },
      },
      scoring: { status: 'completed' },
    },
  });

  it('generates a low severity finding when DNSSEC is not observed', () => {
    const scan = createBaseScan();
    (scan.categories.dns.data as any).dnssec = {
      observed: false,
      note: 'No DNSKEY or DS records observed.',
    };

    const findings = buildFindings(scan);
    const dnssecFinding = findings.find((f) => f.title.includes('DNSSEC'));

    expect(dnssecFinding).toBeDefined();
    expect(dnssecFinding?.severity).toBe('low');
    expect(dnssecFinding?.category).toBe('dns');
    expect(dnssecFinding?.analysis?.whatIsThis).toContain('DNSSEC');
  });

  it('generates high severity finding when Shodan detects an exposed database port (e.g. 3306 MySQL)', () => {
    const scan = createBaseScan();
    (scan.categories.exposure.data as any).shodan = [
      {
        ip: '198.51.100.5',
        ports: [80, 443, 3306],
        cpes: [],
        vulns: [],
        tags: [],
        available: true,
        hasData: true,
      },
    ];

    const findings = buildFindings(scan);
    const portFinding = findings.find((f) => f.title.includes('3306'));

    expect(portFinding).toBeDefined();
    expect(portFinding?.severity).toBe('high');
    expect(portFinding?.kind).toBe('potential_risk');
    expect(portFinding?.description).toContain('Database');
    expect(portFinding?.analysis?.remediation).toContain('localhost');
  });

  it('generates a high severity finding when Shodan records known CVEs', () => {
    const scan = createBaseScan();
    (scan.categories.exposure.data as any).shodan = [
      {
        ip: '198.51.100.5',
        ports: [80, 443],
        cpes: [],
        vulns: ['CVE-2021-44228'],
        tags: [],
        available: true,
        hasData: true,
      },
    ];

    const findings = buildFindings(scan);
    const vulnFinding = findings.find((f) => f.title.includes('CVE-2021-44228'));

    expect(vulnFinding).toBeDefined();
    expect(vulnFinding?.severity).toBe('high');
    expect(vulnFinding?.category).toBe('exposure');
    expect(vulnFinding?.analysis?.howDiscovered).toContain('Shodan');
  });

  it('does NOT generate any findings for standard web ports or Anycast geolocation', () => {
    const scan = createBaseScan();
    (scan.categories.exposure.data as any).shodan = [
      {
        ip: '104.21.15.2',
        ports: [80, 443],
        cpes: [],
        vulns: [],
        tags: ['cdn'],
        available: true,
        hasData: true,
      },
    ];

    const findings = buildFindings(scan);
    const webPortFinding = findings.find((f) => f.title.includes('port 80') || f.title.includes('port 443'));
    const anycastFinding = findings.find((f) => f.title.toLowerCase().includes('anycast'));

    expect(webPortFinding).toBeUndefined();
    expect(anycastFinding).toBeUndefined();
  });

  it('deducts points for DNSSEC missing, exposed risky ports, and CVEs in computeExposureScore and scoreBreakdown', () => {
    const scan = createBaseScan();
    // Simulate DNSSEC missing (-3), exposed database port (-10), confirmed CVE (-10)
    (scan.categories.dns.data as any).dnssec = { observed: false };
    (scan.categories.exposure.data as any).shodan = [
      {
        ip: '198.51.100.5',
        ports: [3306],
        vulns: ['CVE-2021-41773'],
        available: true,
        hasData: true,
      },
    ];

    const score = computeExposureScore(scan);
    const breakdown = computeScoreBreakdown(scan);

    // 100 - 3 (dnssec) - 10 (database port) - 10 (cve) = 77
    expect(score).toBe(77);
    expect(breakdown.total).toBe(77);
    expect(breakdown.totalDeducted).toBe(23);
    expect(breakdown.dimensions.dnssecHygiene?.deducted).toBe(3);
    expect(breakdown.dimensions.networkExposure?.deducted).toBe(20);
  });
});
