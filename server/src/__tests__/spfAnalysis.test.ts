import { analyzeSpf } from '../services/spfAnalysis';

describe('SPF Record Analysis', () => {
  it('returns present: false for empty or non-SPF record', () => {
    expect(analyzeSpf(undefined).present).toBe(false);
    expect(analyzeSpf('').present).toBe(false);
    expect(analyzeSpf('some random text').present).toBe(false);
  });

  it('correctly identifies hardfail (-all)', () => {
    const res = analyzeSpf('v=spf1 include:_spf.google.com -all');
    expect(res.present).toBe(true);
    expect(res.allQualifier).toBe('hardfail');
    expect(res.warnings).toHaveLength(0);
    expect(res.dnsLookupCount).toBe(1);
  });

  it('correctly identifies softfail (~all)', () => {
    const res = analyzeSpf('v=spf1 ip4:192.0.2.1 ~all');
    expect(res.present).toBe(true);
    expect(res.allQualifier).toBe('softfail');
    expect(res.dnsLookupCount).toBe(0); // ip4 does not require DNS lookup
  });

  it('flags dangerous +all or bare all qualifier', () => {
    const res1 = analyzeSpf('v=spf1 +all');
    expect(res1.allQualifier).toBe('allow_all');
    expect(res1.warnings.some((w) => w.includes('+all'))).toBe(true);

    const res2 = analyzeSpf('v=spf1 include:example.com all');
    expect(res2.allQualifier).toBe('allow_all');
  });

  it('flags neutral ?all qualifier', () => {
    const res = analyzeSpf('v=spf1 include:example.com ?all');
    expect(res.allQualifier).toBe('neutral');
    expect(res.warnings.some((w) => w.includes('?all'))).toBe(true);
  });

  it('detects lookup limit exceeding RFC 7208 maximum of 10', () => {
    const mechanisms = Array.from({ length: 12 }, (_, i) => `include:provider${i}.com`).join(' ');
    const res = analyzeSpf(`v=spf1 ${mechanisms} -all`);
    expect(res.dnsLookupCount).toBe(12);
    expect(res.warnings.some((w) => w.includes('exceeding the RFC 7208 limit of 10'))).toBe(true);
  });
});
