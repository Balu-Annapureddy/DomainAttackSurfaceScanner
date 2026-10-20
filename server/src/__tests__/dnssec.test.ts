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
    expect(result.dnssec.status).toBe('signed');
    expect(result.dnssec.note).toContain('DNSSEC records');
    expect(result.dnssec.record).toBeDefined();
  });

  it('confirms unsigned when both DNSKEY and parent DS return Status 0 with no answers', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    // 1st call: DNSKEY query -> Status 0, no answers
    fetchMock.mockResolvedValueOnce({
      Status: 0,
      AD: false,
      Answer: undefined,
    });
    // 2nd call: parent DS query -> Status 0, no answers
    fetchMock.mockResolvedValueOnce({
      Status: 0,
      AD: false,
      Answer: undefined,
    });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('unsigned');
    expect(result.dnssec.note).toContain('No DNSKEY or parent DS records observed');
  });

  it('classifies as bogus when normal query fails validation while comparable CD=1 query returns records', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    // 1st query: DNSKEY -> Status 2
    fetchMock.mockResolvedValueOnce({ Status: 2 });
    // 2nd query: DS -> Status 0
    fetchMock.mockResolvedValueOnce({ Status: 0 });
    // 3rd query: CD=1 query for DNSKEY -> Status 0 with matching type 48 records
    fetchMock.mockResolvedValueOnce({
      Status: 0,
      Answer: [{ type: 48, data: '257 3 13 testkey' }],
    });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('bogus');
    expect(result.dnssec.inconclusive).toBe(false);
    expect(result.dnssec.note).toContain('validation failure observed');
  });

  it('classifies as inconclusive when both normal query and CD=1 query fail', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    // 1st query: DNSKEY -> Status 2
    fetchMock.mockResolvedValueOnce({ Status: 2 });
    // 2nd query: DS -> Status 0
    fetchMock.mockResolvedValueOnce({ Status: 0 });
    // 3rd query: CD=1 query also fails with Status 2
    fetchMock.mockResolvedValueOnce({ Status: 2 });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('inconclusive');
    expect(result.dnssec.inconclusive).toBe(true);
    expect(result.dnssec.note).toContain('inconclusive');
  });

  it('classifies as inconclusive when normal query fails but CD=1 returns unrelated or empty records', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    // 1st query: DNSKEY -> Status 2
    fetchMock.mockResolvedValueOnce({ Status: 2 });
    // 2nd query: DS -> Status 0
    fetchMock.mockResolvedValueOnce({ Status: 0 });
    // 3rd query: CD=1 returns Status 0, but only unrelated A record (type 1) instead of DNSKEY (type 48)
    fetchMock.mockResolvedValueOnce({
      Status: 0,
      Answer: [{ type: 1, data: '93.184.216.34' }],
    });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('inconclusive');
    expect(result.dnssec.inconclusive).toBe(true);
  });

  it('classifies generic SERVFAIL without validation-specific evidence as inconclusive', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    // Google DoH returns generic SERVFAIL without comment or CD=1 confirmation
    fetchMock.mockResolvedValue({
      Status: 2,
      AD: false,
    });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('inconclusive');
    expect(result.dnssec.inconclusive).toBe(true);
    expect(result.dnssec.note).toContain('generic SERVFAIL without DNSSEC-validation evidence');
  });

  it('classifies as bogus when resolver returns SERVFAIL with validation failure comment', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      Status: 2,
      Comment: 'DNSSEC validation failure: expired RRSIG signature',
    });

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('bogus');
    expect(result.dnssec.inconclusive).toBe(false);
    expect(result.dnssec.note).toContain('validation failure observed');
  });

  it('handles ambiguous responses (e.g. one query 0, one query non-zero or error) as inconclusive', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    // 1st query succeeds with Status 0 but no answers
    fetchMock.mockResolvedValueOnce({ Status: 0 });
    // 2nd query fails with network error
    fetchMock.mockRejectedValueOnce(new Error('Connection reset'));
    // Fallback also fails
    fetchMock.mockRejectedValue(new Error('Fallback timeout'));

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('inconclusive');
    expect(result.dnssec.inconclusive).toBe(true);
  });

  it('handles timeout or malformed responses gracefully as inconclusive', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockRejectedValue(new Error('DNS DoH lookup timeout or malformed response'));

    const result = await runDns('example.com');

    expect(result.dnssec.observed).toBe(false);
    expect(result.dnssec.status).toBe('inconclusive');
    expect(result.dnssec.inconclusive).toBe(true);
    expect(result.dnssec.note).toContain('inconclusive');
  });
});
