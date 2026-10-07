import { analyzeDmarc } from '../services/dmarcAnalysis';

describe('DMARC Record Analysis', () => {
  it('handles missing or invalid records', () => {
    const res = analyzeDmarc(undefined);
    expect(res.present).toBe(false);
    expect(res.policyStrength).toBe('missing');
  });

  it('correctly parses reject policy (p=reject)', () => {
    const res = analyzeDmarc('v=DMARC1; p=reject; rua=mailto:dmarc@example.com; pct=100');
    expect(res.present).toBe(true);
    expect(res.policyStrength).toBe('reject');
    expect(res.ruaAddresses).toEqual(['dmarc@example.com']);
    expect(res.percentage).toBe(100);
    expect(res.warnings).toHaveLength(0);
  });

  it('correctly parses quarantine policy (p=quarantine)', () => {
    const res = analyzeDmarc('v=DMARC1; p=quarantine; rua=mailto:reports@example.com');
    expect(res.present).toBe(true);
    expect(res.policyStrength).toBe('quarantine');
    expect(res.ruaAddresses).toEqual(['reports@example.com']);
  });

  it('flags p=none as monitoring mode with warning', () => {
    const res = analyzeDmarc('v=DMARC1; p=none; rua=mailto:reports@example.com');
    expect(res.present).toBe(true);
    expect(res.policyStrength).toBe('none');
    expect(res.warnings.some((w) => w.includes('monitoring mode'))).toBe(true);
  });

  it('flags p=none without rua as ineffective', () => {
    const res = analyzeDmarc('v=DMARC1; p=none');
    expect(res.policyStrength).toBe('none');
    expect(res.warnings.some((w) => w.includes('provides no protection'))).toBe(true);
  });

  it('warns when pct is less than 100 on enforcement policies', () => {
    const res = analyzeDmarc('v=DMARC1; p=quarantine; pct=50; rua=mailto:rep@example.com');
    expect(res.percentage).toBe(50);
    expect(res.warnings.some((w) => w.includes('pct=50'))).toBe(true);
  });
});
