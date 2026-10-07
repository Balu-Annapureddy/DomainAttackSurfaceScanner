import { runIpIntelligence, clearIpIntelligenceCache } from '../services/ipIntelligence';
import * as providerHttp from '../services/providerHttp';

jest.mock('../services/providerHttp', () => ({
  fetchProviderJson: jest.fn(),
}));

describe('ipIntelligence service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearIpIntelligenceCache();
  });

  it('marks result unavailable when primary provider returns an error payload and fallback also fails', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;

    // Primary returns ipapi.co rate limit payload
    fetchMock.mockResolvedValueOnce({
      error: true,
      reason: 'Rate limit exceeded',
      message: 'Usage limit reached for this month',
    });

    // Fallback also fails
    fetchMock.mockRejectedValueOnce(new Error('ip-api.com connection timeout'));

    const result = await runIpIntelligence(['198.51.100.1']);

    expect(result).toHaveLength(1);
    expect(result[0]!.available).toBe(false);
    expect(result[0]!.reason).toContain('Rate limit exceeded');
    expect(result[0]!.country).toBeUndefined();
    expect(result[0]!.city).toBeUndefined();
  });

  it('falls back to secondary provider (ip-api.com) when primary returns rate-limit error', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;

    // Primary (ipapi.co) returns rate-limit error
    fetchMock.mockResolvedValueOnce({
      error: true,
      reason: 'Rate limited',
      message: 'Rate limit reached',
    });

    // Fallback (ip-api.com) succeeds with different field mapping
    fetchMock.mockResolvedValueOnce({
      status: 'success',
      country: 'United States',
      regionName: 'California',
      city: 'San Francisco',
      lat: 37.7749,
      lon: -122.4194,
      as: 'AS13335 Cloudflare, Inc.',
      org: 'Cloudflare, Inc.',
      isp: 'Cloudflare',
    });

    const result = await runIpIntelligence(['198.51.100.2']);

    expect(result).toHaveLength(1);
    expect(result[0]!.available).toBe(true);
    expect(result[0]!.country).toBe('United States');
    expect(result[0]!.region).toBe('California');
    expect(result[0]!.city).toBe('San Francisco');
    expect(result[0]!.latitude).toBe(37.7749);
    expect(result[0]!.longitude).toBe(-122.4194);
    expect(result[0]!.asn).toBe('AS13335 Cloudflare, Inc.');
    expect(result[0]!.organization).toBe('Cloudflare, Inc.');
    expect(result[0]!.anycastLikely).toBe(true);
  });

  it('detects anycastLikely for major CDN and cloud providers', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;

    fetchMock.mockResolvedValueOnce({
      asn: 'AS16509',
      org: 'Amazon.com, Inc.',
      country_name: 'United States',
      region: 'Virginia',
      city: 'Ashburn',
      latitude: 39.0437,
      longitude: -77.4875,
    });

    const result = await runIpIntelligence(['54.239.28.85']);

    expect(result).toHaveLength(1);
    expect(result[0]!.available).toBe(true);
    expect(result[0]!.anycastLikely).toBe(true);
  });

  it('caches lookup results to avoid burning rate limits within TTL', async () => {
    const fetchMock = providerHttp.fetchProviderJson as jest.Mock;

    fetchMock.mockResolvedValueOnce({
      asn: 'AS15169',
      org: 'Google LLC',
      country_name: 'United States',
      city: 'Mountain View',
    });

    // First lookup
    const first = await runIpIntelligence(['8.8.8.8']);
    expect(first[0]!.organization).toBe('Google LLC');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second lookup for the same IP uses cache
    const second = await runIpIntelligence(['8.8.8.8']);
    expect(second[0]!.organization).toBe('Google LLC');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
