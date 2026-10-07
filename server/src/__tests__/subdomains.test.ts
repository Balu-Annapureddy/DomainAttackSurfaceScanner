import { runSubdomains } from '../services/subdomains';

jest.mock('../services/publicResolution', () => ({
  resolvePublicAddresses: jest.fn().mockResolvedValue(['93.184.216.34']),
  isPublicAddress: jest.fn().mockReturnValue(true),
}));

describe('subdomains service with fallback', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns subdomains from certspotter when crt.sh fails completely', async () => {
    globalThis.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('crt.sh')) {
        return Promise.reject(new Error('crt.sh 504 Gateway Timeout'));
      }
      if (url.includes('api.certspotter.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([
            { dns_names: ['api.example.com', 'admin.example.com'] },
          ]),
        } as unknown as Response);
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await runSubdomains('example.com');

    expect(result.available).toBe(true);
    expect(result.subdomains).toEqual(['admin.example.com', 'api.example.com']);
    expect(result.subdomainSources?.['api.example.com']).toEqual(['Certspotter']);
    expect(result.subdomainSources?.['admin.example.com']).toEqual(['Certspotter']);
  });

  it('merges and de-duplicates overlapping results from crt.sh and certspotter', async () => {
    globalThis.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('crt.sh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([
            { name_value: 'api.example.com\nmail.example.com' },
          ]),
        } as unknown as Response);
      }
      if (url.includes('api.certspotter.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify([
            { dns_names: ['api.example.com', 'blog.example.com'] },
          ]),
        } as unknown as Response);
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await runSubdomains('example.com');

    expect(result.available).toBe(true);
    expect(result.subdomains).toEqual(['api.example.com', 'blog.example.com', 'mail.example.com']);
    // Overlapping subdomain tagged with both sources
    expect(result.subdomainSources?.['api.example.com']).toContain('crt.sh');
    expect(result.subdomainSources?.['api.example.com']).toContain('Certspotter');
    // Unique subdomains tagged with single source
    expect(result.subdomainSources?.['mail.example.com']).toEqual(['crt.sh']);
    expect(result.subdomainSources?.['blog.example.com']).toEqual(['Certspotter']);
  });

  it('marks unavailable when both sources fail', async () => {
    globalThis.fetch = jest.fn().mockImplementation(() => {
      return Promise.reject(new Error('Network unavailable'));
    });

    const result = await runSubdomains('example.com');

    expect(result.available).toBe(false);
    expect(result.subdomains).toEqual([]);
    expect(result.reason).toBeDefined();
  });
});
