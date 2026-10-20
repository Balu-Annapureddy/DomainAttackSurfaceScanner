import dns from 'node:dns/promises';
import { checkSubdomainTakeover, TAKEOVER_RULES } from '../services/takeoverCheck';
import * as safeHttp from '../services/safeHttp';

jest.mock('node:dns/promises');
jest.mock('../services/safeHttp');

describe('Subdomain Takeover Risk Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly identifies a dangling GitHub Pages CNAME with unclaimed 404 response', async () => {
    (dns.resolveCname as jest.Mock).mockResolvedValue(['dangling-repo.github.io']);
    (safeHttp.safeGet as jest.Mock).mockResolvedValue({
      status: 404,
      body: "404 Not Found: There isn't a GitHub Pages site here. If you're trying to publish...",
      headers: {},
      url: 'http://docs.example.com/',
      redirectChain: [],
    });

    const result = await checkSubdomainTakeover(['docs.example.com']);

    expect(result.checkedCount).toBe(1);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.subdomain).toBe('docs.example.com');
    expect(result.matches[0]?.cname).toBe('dangling-repo.github.io');
    expect(result.matches[0]?.service).toBe('GitHub Pages');
    expect(result.matches[0]?.confirmed).toBe(true);
  });

  it('does NOT false-positive on a properly configured GitHub Pages site serving real content', async () => {
    (dns.resolveCname as jest.Mock).mockResolvedValue(['legit-org.github.io']);
    (safeHttp.safeGet as jest.Mock).mockResolvedValue({
      status: 200,
      body: '<html><head><title>Legitimate Project Documentation</title></head><body>Welcome to the docs</body></html>',
      headers: {},
      url: 'http://docs.example.com/',
      redirectChain: [],
    });

    const result = await checkSubdomainTakeover(['docs.example.com']);

    expect(result.checkedCount).toBe(1);
    expect(result.matches).toHaveLength(0); // Zero matches, no false positive!
  });

  it('correctly identifies an abandoned Amazon S3 bucket with NoSuchBucket error', async () => {
    (dns.resolveCname as jest.Mock).mockResolvedValue(['old-assets.s3.amazonaws.com']);
    (safeHttp.safeGet as jest.Mock).mockResolvedValue({
      status: 404,
      body: '<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message></Error>',
      headers: {},
      url: 'http://assets.example.com/',
      redirectChain: [],
    });

    const result = await checkSubdomainTakeover(['assets.example.com']);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.service).toBe('Amazon S3');
    expect(result.matches[0]?.confirmed).toBe(true);
  });

  it('skips subdomains without CNAME records gracefully', async () => {
    (dns.resolveCname as jest.Mock).mockRejectedValue(new Error('ENODATA: no CNAME record found'));

    const result = await checkSubdomainTakeover(['direct-a-record.example.com']);

    expect(result.checkedCount).toBe(1);
    expect(result.matches).toHaveLength(0);
    expect(safeHttp.safeGet).not.toHaveBeenCalled();
  });
});
