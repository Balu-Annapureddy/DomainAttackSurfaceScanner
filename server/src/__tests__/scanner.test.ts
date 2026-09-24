import express from 'express';
import request from 'supertest';
import scanRouter from '../routes/scan';
import { validateDomain } from '../services/domainValidation';
import { isPublicAddress } from '../services/publicResolution';
import { buildNormalizedAssets } from '../services/normalization';
import { computeExposureScore } from '../services/scoring';
import { ScanRequestBudget } from '../services/scanBudget';
import { buildFindings } from '../services/findings';
import { compareScans } from '../services/diff';
import type { DomainScan } from '../../../shared/types';

const app = express();
app.use(express.json());
app.use('/api/scan', scanRouter);

describe('domain validation', () => {
  test('normalizes a public domain', () => {
    expect(validateDomain(' Example.COM. ')).toBe('example.com');
  });

  describe('public destination protection', () => {
    test.each([
      '127.0.0.1',
      '10.0.0.1',
      '172.16.0.1',
      '192.168.1.1',
      '169.254.1.1',
      '::1',
      'fc00::1',
      'fe80::1',
      'ff02::1',
      '203.0.113.10',
    ])('rejects reserved address %s', (address) => {
      expect(isPublicAddress(address)).toBe(false);
    });

    test('accepts a public address', () => {
      expect(isPublicAddress('8.8.8.8')).toBe(true);
    });
  });

  test.each(['127.0.0.1', 'localhost', 'service.internal', 'example', 'bad..example.com'])(
    'rejects unsafe or malformed input: %s',
    (domain) => {
      expect(() => validateDomain(domain)).toThrow();
    },
  );
});

describe('normalized intelligence & relationships', () => {
  test('creates evidence-backed DNS relationships, certificate fingerprint, and IP-to-geolocation link', () => {
    const scan: DomainScan = {
      scanId: 'scan',
      domain: 'example.com',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      status: 'completed',
      categories: {
        whois: { status: 'completed' },
        dns: { status: 'completed', data: { addresses: ['93.184.216.34'], aaaa: [], ns: ['ns.example.com'], mx: [] } },
        subdomains: { status: 'completed', data: { subdomains: ['api.example.com'] } },
        tls: {
          status: 'completed',
          data: {
            subjectAltNames: ['example.com', 'api.example.com'],
            issuer: 'CN=DigiCert Global Root G2',
            fingerprint256: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
            serialNumber: '047a98b712',
          },
        },
        http: { status: 'completed' },
        exposure: { status: 'completed' },
        scoring: { status: 'completed' },
      },
      assets: [],
      relationships: [],
      findings: [],
      warnings: [],
    };

    const ipIntel = [
      {
        ip: '93.184.216.34',
        version: 4 as const,
        asn: 'AS15133',
        organization: 'MCI Communications Services',
        city: 'Norwell',
        country: 'United States',
        latitude: 42.16,
        longitude: -70.82,
        approximate: true as const,
        available: true,
      },
    ];

    const result = buildNormalizedAssets(scan, ipIntel);

    // IP Asset
    const ipAsset = result.assets.find((asset) => asset.type === 'IP' && asset.value === '93.184.216.34');
    expect(ipAsset).toBeDefined();

    // Resolves to relationship
    expect(result.relationships.some((rel) => rel.type === 'resolves_to' && rel.toAssetId === ipAsset?.id)).toBe(true);

    // Certificate asset identified by SHA-256 fingerprint
    const certAsset = result.assets.find((asset) => asset.type === 'CERTIFICATE');
    expect(certAsset).toBeDefined();
    expect(certAsset?.value).toMatch(/^SHA256:aabbcc/i);
    expect(certAsset?.metadata?.fingerprint256).toBe('AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99');

    // Geolocation asset with approximate semantics
    const geoAsset = result.assets.find((asset) => asset.type === 'GEOLOCATION');
    expect(geoAsset).toBeDefined();
    expect(geoAsset?.metadata?.city).toBe('Norwell');
    expect(geoAsset?.metadata?.country).toBe('United States');
    expect(geoAsset?.metadata?.accuracy).toBe('approximate');

    // Relationship linking IP -> GEOLOCATION
    const geoRel = result.relationships.find((rel) => rel.type === 'located_approximately_at');
    expect(geoRel).toBeDefined();
    expect(geoRel?.fromAssetId).toBe(ipAsset?.id);
    expect(geoRel?.toAssetId).toBe(geoAsset?.id);
  });
});

describe('ScanRequestBudget', () => {
  test('tracks consumption and enforces outbound limit', () => {
    const budget = new ScanRequestBudget(5);
    expect(budget.remaining()).toBe(5);
    expect(budget.isExhausted()).toBe(false);

    budget.consume(3);
    expect(budget.consumed()).toBe(3);
    expect(budget.remaining()).toBe(2);

    expect(budget.tryConsume(2)).toBe(true);
    expect(budget.isExhausted()).toBe(true);
    expect(budget.remaining()).toBe(0);

    expect(budget.tryConsume(1)).toBe(false);
    expect(() => budget.consume(1)).toThrow(/budget exhausted/);
  });
});

describe('exposure posture scoring', () => {
  function makeScan(overrides: Partial<DomainScan['categories']> = {}): DomainScan {
    return {
      scanId: 'scan-1',
      domain: 'test.com',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      status: 'completed',
      categories: {
        whois: { status: 'completed', data: { privacyStatus: 'redacted' } },
        dns: { status: 'completed', data: { spf: { present: true }, dmarc: { present: true } } },
        subdomains: { status: 'completed', data: { subdomains: Array(150).fill('sub.test.com') } },
        tls: { status: 'completed', data: { available: true, validTo: new Date(Date.now() + 1000 * 86400 * 90).toISOString() } },
        http: { status: 'completed', data: { httpsEnforced: true, https: { missingSecurityHeaders: [] } } },
        exposure: { status: 'completed' },
        scoring: { status: 'completed' },
        ...overrides,
      },
      assets: [],
      relationships: [],
      findings: [],
      warnings: [],
    };
  }

  test('does not penalize high subdomain counts or WHOIS privacy (intelligence, not weakness)', () => {
    const scan = makeScan();
    const score = computeExposureScore(scan);
    // Baseline configuration is fully compliant: TLS available, HTTPS enforced, headers present, SPF/DMARC present
    expect(score).toBe(100);
  });

  test('penalizes observable posture deficiencies: no HTTPS enforcement', () => {
    const scan = makeScan({
      http: { status: 'completed', data: { httpsEnforced: false, https: { missingSecurityHeaders: [] } } },
    });
    const score = computeExposureScore(scan);
    expect(score).toBe(80); // -20 for unenforced HTTPS
  });

  test('penalizes missing TLS and missing email authentication', () => {
    const scan = makeScan({
      tls: { status: 'completed', data: { available: false } },
      dns: { status: 'completed', data: { spf: { present: false }, dmarc: { present: false } } },
    });
    const score = computeExposureScore(scan);
    // -25 for no TLS, -5 for missing SPF, -5 for missing DMARC
    expect(score).toBe(65);
  });
});

describe('findings contextual guidance', () => {
  test('generates actionable, contextual descriptions for missing security headers', () => {
    const scan: DomainScan = {
      scanId: 'scan',
      domain: 'example.com',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
      status: 'completed',
      categories: {
        whois: { status: 'completed' },
        dns: { status: 'completed', data: { spf: { present: false }, dmarc: { present: true } } },
        subdomains: { status: 'completed' },
        tls: { status: 'completed', data: { available: true } },
        http: {
          status: 'completed',
          data: {
            httpsEnforced: false,
            httpAvailable: true,
            https: { missingSecurityHeaders: ['content-security-policy', 'strict-transport-security'] },
          },
        },
        exposure: { status: 'completed' },
        scoring: { status: 'completed' },
      },
      assets: [],
      relationships: [],
      findings: [],
      warnings: [],
    };

    const findings = buildFindings(scan);
    const cspFinding = findings.find((f) => f.title.includes('content-security-policy'));
    expect(cspFinding).toBeDefined();
    expect(cspFinding?.description).toContain('cross-site scripting');
    expect(cspFinding?.description).toContain('configuration hygiene');

    const httpsFinding = findings.find((f) => f.title === 'HTTPS enforcement was not observed');
    expect(httpsFinding).toBeDefined();
    expect(httpsFinding?.severity).toBe('medium');
  });
});

describe('scan route', () => {
  test('rejects invalid domains before starting outbound work', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({ domain: '192.168.1.1' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_DOMAIN');
  });
});

describe('scan differencing & change detection', () => {
  const baseScan: DomainScan = {
    scanId: 'base-1',
    domain: 'example.com',
    createdAt: '2026-09-20T10:00:00Z',
    expiresAt: '2026-09-21T10:00:00Z',
    status: 'completed',
    score: 80,
    categories: {
      whois: { status: 'completed' },
      dns: {
        status: 'completed',
        data: {
          spf: { present: true, policy: 'v=spf1 include:_spf.example.com ~all' },
          dmarc: { present: true, policy: 'p=none' },
          ns: ['ns1.example.com', 'ns2.example.com'],
        },
      },
      subdomains: { status: 'completed' },
      tls: {
        status: 'completed',
        data: {
          fingerprint256: 'AA:11:22:33',
          validTo: '2026-12-31T00:00:00Z',
          issuer: 'Let\'s Encrypt',
        },
      },
      http: { status: 'completed' },
      exposure: { status: 'completed' },
      scoring: { status: 'completed' },
    },
    assets: [
      { id: '1', type: 'DOMAIN', value: 'example.com', targetDomain: 'example.com', discoveredAt: '2026-09-20T10:00:00Z', evidence: [] },
      { id: '2', type: 'SUBDOMAIN', value: 'old.example.com', targetDomain: 'example.com', discoveredAt: '2026-09-20T10:00:00Z', evidence: [] },
      { id: '3', type: 'IP', value: '93.184.216.34', targetDomain: 'example.com', discoveredAt: '2026-09-20T10:00:00Z', evidence: [] },
    ],
    relationships: [],
    findings: [
      {
        id: 'f1',
        title: 'Missing content-security-policy response header',
        severity: 'low',
        kind: 'configuration_weakness',
        category: 'http',
        description: 'Missing CSP',
        recommendation: 'Add CSP',
        evidence: [],
        confidence: 'high',
      },
    ],
    warnings: [],
  };

  const currentScan: DomainScan = {
    ...baseScan,
    scanId: 'curr-2',
    createdAt: '2026-09-24T10:00:00Z',
    score: 95,
    categories: {
      ...baseScan.categories,
      dns: {
        status: 'completed',
        data: {
          spf: { present: true, policy: 'v=spf1 include:_spf.example.com -all' }, // Strengthened SPF
          dmarc: { present: true, policy: 'p=reject' }, // Strengthened DMARC
          ns: ['ns1.example.com', 'ns3.example.com'], // ns2 removed, ns3 added
        },
      },
      tls: {
        status: 'completed',
        data: {
          fingerprint256: 'BB:44:55:66', // Rotated cert
          validTo: '2027-03-31T00:00:00Z',
          issuer: 'DigiCert',
        },
      },
    },
    assets: [
      { id: '1', type: 'DOMAIN', value: 'example.com', targetDomain: 'example.com', discoveredAt: '2026-09-24T10:00:00Z', evidence: [] },
      { id: '4', type: 'SUBDOMAIN', value: 'api.example.com', targetDomain: 'example.com', discoveredAt: '2026-09-24T10:00:00Z', evidence: [] }, // New
      { id: '3', type: 'IP', value: '93.184.216.34', targetDomain: 'example.com', discoveredAt: '2026-09-24T10:00:00Z', evidence: [] },
    ],
    findings: [], // CSP issue resolved
  };

  test('detects added and removed assets, score delta, cert rotation, and resolved findings', () => {
    const diff = compareScans(baseScan, currentScan);

    expect(diff.scoreDelta).toBe(15); // 95 - 80
    expect(diff.addedAssets.some((a) => a.value === 'api.example.com')).toBe(true);
    expect(diff.removedAssets.some((a) => a.value === 'old.example.com')).toBe(true);
    expect(diff.persistedAssetsCount).toBe(2); // example.com + 93.184.216.34

    // Findings delta
    expect(diff.resolvedFindings.length).toBe(1);
    expect(diff.resolvedFindings[0]?.title).toContain('content-security-policy');
    expect(diff.newFindings.length).toBe(0);

    // Certificate rotation
    expect(diff.certificateDiff.changed).toBe(true);
    expect(diff.certificateDiff.baselineFingerprint).toBe('AA:11:22:33');
    expect(diff.certificateDiff.currentFingerprint).toBe('BB:44:55:66');

    // DNS changes
    expect(diff.dnsDiff.changed).toBe(true);
    expect(diff.dnsDiff.addedNameservers).toContain('ns3.example.com');
    expect(diff.dnsDiff.removedNameservers).toContain('ns2.example.com');
  });

  test('refuses to compare scans for different domains', () => {
    const mismatched = { ...currentScan, domain: 'another.com' };
    expect(() => compareScans(baseScan, mismatched)).toThrow(/different domains/);
  });
});
