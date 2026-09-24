import express from 'express';
import request from 'supertest';
import scanRouter from '../routes/scan';
import { validateDomain } from '../services/domainValidation';
import { isPublicAddress } from '../services/publicResolution';
import { buildNormalizedAssets } from '../services/normalization';

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

  describe('normalized intelligence', () => {
    test('creates evidence-backed DNS relationships', () => {
      const scan = {
        scanId: 'scan',
        domain: 'example.com',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        status: 'completed' as const,
        categories: {
          whois: { status: 'completed' as const },
          dns: { status: 'completed' as const, data: { addresses: ['8.8.8.8'], aaaa: [], ns: ['ns.example.com'], mx: [] } },
          subdomains: { status: 'completed' as const, data: { subdomains: ['api.example.com'] } },
          tls: { status: 'completed' as const, data: { subjectAltNames: ['example.com', 'api.example.com'] } },
          http: { status: 'completed' as const },
          exposure: { status: 'completed' as const },
          scoring: { status: 'completed' as const },
        },
        assets: [],
        relationships: [],
        findings: [],
        warnings: [],
      };
      const result = buildNormalizedAssets(scan);
      expect(result.assets.some((asset) => asset.type === 'IP' && asset.value === '8.8.8.8')).toBe(true);
      expect(result.relationships.some((relationship) => relationship.type === 'resolves_to')).toBe(true);
      expect(result.assets.find((asset) => asset.type === 'SUBDOMAIN')?.evidence[0]?.source).toBe('Certificate Transparency');
    });
  });

  test.each(['127.0.0.1', 'localhost', 'service.internal', 'example', 'bad..example.com'])(
    'rejects unsafe or malformed input: %s',
    (domain) => {
      expect(() => validateDomain(domain)).toThrow();
    },
  );
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
