import { runShodanIntel, queryShodanHost, clearShodanCache } from '../services/shodanIntel';
import { ScanRequestBudget } from '../services/scanBudget';
import * as providerHttp from '../services/providerHttp';

jest.mock('../services/providerHttp', () => ({
  fetchProviderJson: jest.fn(),
}));

describe('shodanIntel service (InternetDB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearShodanCache();
  });

  it('handles 200 response with open ports, CVEs, and tags', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      ip: '198.51.100.10',
      ports: [80, 443, 8080],
      cpes: ['cpe:/a:apache:http_server:2.4.41'],
      hostnames: ['web.example.com'],
      vulns: ['CVE-2021-41773'],
      tags: ['cloud'],
    });

    const result = await queryShodanHost('198.51.100.10');

    expect(result.available).toBe(true);
    expect(result.hasData).toBe(true);
    expect(result.ports).toEqual([80, 443, 8080]);
    expect(result.vulns).toEqual(['CVE-2021-41773']);
    expect(result.tags).toEqual(['cloud']);
  });

  it('handles 404 cleanly as normal "no data" rather than a system failure', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockRejectedValueOnce(new Error('Provider returned HTTP 404'));

    const result = await queryShodanHost('198.51.100.20');

    expect(result.available).toBe(true);
    expect(result.hasData).toBe(false);
    expect(result.ports).toEqual([]);
    expect(result.vulns).toEqual([]);
    expect(result.reason).toBeUndefined();
  });

  it('marks available: false when network or timeout errors occur', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    fetchMock.mockRejectedValueOnce(new Error('Provider request timed out'));

    const result = await queryShodanHost('198.51.100.30');

    expect(result.available).toBe(false);
    expect(result.hasData).toBe(false);
    expect(result.reason).toContain('timed out');
  });

  it('respects ScanRequestBudget and does not execute queries when budget is exhausted', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;
    const budget = new ScanRequestBudget(1);
    budget.consume(1, 'Exhaust budget');

    const results = await runShodanIntel(['198.51.100.40'], { budget });

    expect(results).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
