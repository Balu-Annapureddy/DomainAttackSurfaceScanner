import { runDns } from '../services/dns';
import * as providerHttp from '../services/providerHttp';

jest.mock('../services/publicResolution', () => ({
  resolvePublicAddresses: jest.fn().mockResolvedValue(['93.184.216.34']),
  isPublicAddress: jest.fn().mockReturnValue(true),
}));

jest.mock('node:dns/promises', () => ({
  __esModule: true,
  default: {
    resolve6: jest.fn().mockResolvedValue([]),
    resolveMx: jest.fn().mockResolvedValue([]),
    resolveNs: jest.fn().mockResolvedValue(['ns1.example.com']),
    resolveTxt: jest.fn().mockResolvedValue([['v=spf1 -all']]),
    resolveCname: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../services/providerHttp', () => ({
  fetchProviderJson: jest.fn(),
}));

describe('dnssec presence check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('observes DNSSEC when provider returns DNSKEY records', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      Status: 0,
      AD: true,
      Answer: [
        { type: 48, data: '257 3 13 mdsswUyr3DPW132mOi8V9xESWE8jTo0dxCjjnopKl' },
      ],
    });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(true);
    expect(result.dnssec.note).toContain('DNSSEC records');
    expect(result.dnssec.record).toBeDefined();
  });

  it('marks DNSSEC as not observed when provider returns no DNSKEY or DS records', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      Status: 0,
      AD: false,
      Answer: undefined,
    });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.note).toContain('No DNSKEY or DS records observed');
  });

  it('handles provider check failures gracefully without throwing', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockRejectedValue(new Error('DNS DoH lookup timeout'));

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.note).toContain('inconclusive');
  });
});
