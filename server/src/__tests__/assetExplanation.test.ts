import { explainAsset } from '../../../shared/assetExplanation';
import type { Asset } from '../../../shared/types';

describe('explainAsset', () => {
  const makeAsset = (type: Asset['type'], value: string, metadata?: Asset['metadata']): Asset => ({
    id: 'test-id',
    type,
    value,
    targetDomain: 'example.com',
    discoveredAt: new Date().toISOString(),
    evidence: [
      {
        source: 'Test Source',
        observedAt: new Date().toISOString(),
        description: 'Test evidence',
        confidence: 'high',
      },
    ],
    metadata,
  });

  it('explains DOMAIN assets with authoritative context', () => {
    const exp = explainAsset(makeAsset('DOMAIN', 'example.com'));
    expect(exp.whatIsThis).toContain('apex domain');
    expect(exp.whyItMatters).toContain('root');
    expect(exp.confidence).toBe('high');
  });

  it('explains SUBDOMAIN assets with attack surface context', () => {
    const exp = explainAsset(makeAsset('SUBDOMAIN', 'api.example.com'));
    expect(exp.whatIsThis).toContain('child hostname');
    expect(exp.whyItMatters).toContain('attack perimeter');
  });

  it('explains IP assets with origin hosting context', () => {
    const exp = explainAsset(makeAsset('IP', '93.184.216.34'));
    expect(exp.whatIsThis).toContain('Internet Protocol address');
    expect(exp.whyItMatters).toContain('origin');
  });

  it('explains ASN assets with BGP routing context', () => {
    const exp = explainAsset(makeAsset('ASN', 'AS15169'));
    expect(exp.whatIsThis).toContain('Autonomous System');
    expect(exp.whyItMatters).toContain('routing');
  });

  it('explains risky ports (e.g. 3306 MySQL) as high risk', () => {
    const exp = explainAsset(makeAsset('PORT', '198.51.100.1:3306', { port: 3306 }));
    expect(exp.isHighRisk).toBe(true);
    expect(exp.whatIsThis).toContain('3306');
    expect(exp.whyItMatters).toContain('high-risk');
    expect(exp.recommendedAction).toContain('Restrict port 3306');
  });

  it('explains standard web ports (80, 443) as normal perimeter', () => {
    const exp = explainAsset(makeAsset('PORT', '198.51.100.1:443', { port: 443 }));
    expect(exp.isHighRisk).toBe(false);
    expect(exp.whatIsThis).toContain('Standard web');
  });

  it('explains VULNERABILITY assets as high risk with CVE details', () => {
    const exp = explainAsset(makeAsset('VULNERABILITY', 'CVE-2021-44228'));
    expect(exp.isHighRisk).toBe(true);
    expect(exp.whatIsThis).toContain('CVE-2021-44228');
    expect(exp.recommendedAction).toContain('patch');
  });

  it('explains DNSSEC assets with cryptographic validation context', () => {
    const exp = explainAsset(makeAsset('DNSSEC', 'example.com (DNSSEC)'));
    expect(exp.whatIsThis).toContain('DNSSEC');
    expect(exp.whyItMatters).toContain('signatures');
  });

  it('differentiates Anycast CDN geolocation from standard physical locations', () => {
    const anycastExp = explainAsset(
      makeAsset('GEOLOCATION', 'Sydney, Australia (Anycast / Edge CDN)', { anycastLikely: true }),
    );
    expect(anycastExp.whatIsThis).toContain('Anycast or CDN edge');

    const standardExp = explainAsset(
      makeAsset('GEOLOCATION', 'Frankfurt, Germany', { anycastLikely: false }),
    );
    expect(standardExp.whatIsThis).toContain('estimated geographic');
  });
});
