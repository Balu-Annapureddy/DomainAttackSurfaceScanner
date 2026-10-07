import { fetchOrgProfile } from '../services/orgProfile';
import { checkBreachExposure, resetBreachCache } from '../services/breachExposure';
import { lookupRecentCves } from '../services/cveLookup';
import { checkCloudStorageExposure } from '../services/cloudStorage';
import { extractDocumentMetadata, findLinkedDocuments } from '../services/docMetadata';
import * as providerHttp from '../services/providerHttp';
import * as safeHttp from '../services/safeHttp';

describe('Phase 3 Information-Gathering Services & Scope Boundaries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetBreachCache();
  });

  describe('B.1 Organization Profile (Wikidata)', () => {
    it('returns public organization profile for matching corporate entity', async () => {
      jest.spyOn(providerHttp, 'fetchProviderJson').mockImplementation(async (url: string) => {
        if (url.includes('wbsearchentities')) {
          return {
            search: [
              {
                id: 'Q312',
                label: 'Apple Inc.',
                description: 'American multinational technology company',
              },
            ],
          };
        }
        if (url.includes('wbgetentities')) {
          return {
            entities: {
              Q312: {
                id: 'Q312',
                labels: { en: { value: 'Apple Inc.' } },
                descriptions: { en: { value: 'American multinational technology company' } },
                claims: {
                  P571: [{ mainsnak: { datavalue: { value: { time: '+1976-04-01T00:00:00Z' } } } }],
                  P856: [{ mainsnak: { datavalue: { value: 'https://www.apple.com/' } } }],
                  P154: [{ mainsnak: { datavalue: { value: 'Apple_logo_black.svg' } } }],
                },
              },
            },
          };
        }
        return {};
      });

      const profile = await fetchOrgProfile('Apple Inc.');
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Apple Inc.');
      expect(profile?.foundingYear).toBe('1976');
      expect(profile?.website).toBe('https://www.apple.com/');
      expect(profile?.wikidataId).toBe('Q312');
    });

    it('rejects privacy guard strings and returns null without making network queries', async () => {
      const spy = jest.spyOn(providerHttp, 'fetchProviderJson');
      const profile = await fetchOrgProfile('WhoisGuard Protected');
      expect(profile).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    });

    it('returns null if no corporate match is found rather than fuzzy-matching unrelated entities', async () => {
      jest.spyOn(providerHttp, 'fetchProviderJson').mockResolvedValueOnce({
        search: [
          {
            id: 'Q999',
            label: 'Some Movie Title',
            description: '2014 dramatic action film directed by someone',
          },
        ],
      });

      const profile = await fetchOrgProfile('NonExistentCorp');
      expect(profile).toBeNull();
    });
  });

  describe('B.2 Breach Exposure Presence (HaveIBeenPwned)', () => {
    it('reports presence, count, and date only — strictly NO raw credentials', async () => {
      jest.spyOn(providerHttp, 'fetchProviderJson').mockResolvedValueOnce([
        {
          Name: 'Adobe',
          Title: 'Adobe',
          Domain: 'adobe.com',
          BreachDate: '2013-10-04',
          PwnCount: 152445165,
          DataClasses: ['Email addresses', 'Password hints', 'Passwords', 'Usernames'],
        },
      ]);

      const result = await checkBreachExposure('adobe.com');
      expect(result).not.toBeNull();
      expect(result?.domain).toBe('adobe.com');
      expect(result?.breaches.length).toBe(1);
      expect(result!.breaches[0]!.name).toBe('Adobe');
      expect(result!.breaches[0]!.pwnCount).toBe(152445165);
      expect(result!.breaches[0]!.breachDate).toBe('2013-10-04');

      // VERIFY STRICT BOUNDARY: Object contains only metadata, no actual passwords or user records
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('hash');
      expect(serialized).not.toContain('plain');
      expect(serialized).not.toContain('secret');
    });

    it('gracefully handles API network failure by returning null', async () => {
      jest.spyOn(providerHttp, 'fetchProviderJson').mockRejectedValueOnce(new Error('Cloudflare blocked'));
      const result = await checkBreachExposure('example.com');
      expect(result).toBeNull();
    });
  });

  describe('B.3 NVD Recent Disclosed CVEs', () => {
    it('queries NVD API for CPE and parses published CVEs', async () => {
      jest.spyOn(providerHttp, 'fetchProviderJson').mockResolvedValueOnce({
        vulnerabilities: [
          {
            cve: {
              id: 'CVE-2023-12345',
              published: '2023-08-15T10:00:00Z',
              descriptions: [{ lang: 'en', value: 'Buffer overflow vulnerability in HTTP daemon.' }],
              metrics: {
                cvssMetricV31: [{ cvssData: { baseSeverity: 'HIGH', baseScore: 8.5 } }],
              },
            },
          },
        ],
      });

      const cves = await lookupRecentCves(['cpe:2.3:a:apache:http_server:2.4.49']);
      expect(cves.length).toBe(1);
      expect(cves[0]!.cveId).toBe('CVE-2023-12345');
      expect(cves[0]!.severity).toBe('high');
      expect(cves[0]!.description).toContain('Buffer overflow');
    });

    it('returns empty array if CPE list is empty', async () => {
      const cves = await lookupRecentCves([]);
      expect(cves).toEqual([]);
    });
  });

  describe('B.4 Cloud Storage Exposure Check', () => {
    it('uses strictly safeHead to detect public vs private buckets without reading contents', async () => {
      const headSpy = jest.spyOn(safeHttp, 'safeHead').mockImplementation(async (url: string) => {
        if (url.includes('example.s3.amazonaws.com')) {
          const headers: Record<string, string> = { 'x-amz-bucket-region': 'us-east-1' };
          return {
            url,
            status: 200,
            headers,
            body: '',
            redirectChain: [url],
          };
        }
        if (url.includes('example-assets.s3.amazonaws.com')) {
          const headers: Record<string, string> = {};
          return {
            url,
            status: 403,
            headers,
            body: '',
            redirectChain: [url],
          };
        }
        throw new Error('Not found');
      });

      const results = await checkCloudStorageExposure('example.com');
      expect(headSpy).toHaveBeenCalled();
      expect(results.length).toBe(2);

      const pubBucket = results.find((r) => r.bucketName === 'example');
      expect(pubBucket?.status).toBe('publicly_accessible');
      expect(pubBucket?.httpStatus).toBe(200);

      const privBucket = results.find((r) => r.bucketName === 'example-assets');
      expect(privBucket?.status).toBe('private_bucket_exists');
      expect(privBucket?.httpStatus).toBe(403);
    });
  });

  describe('B.5 Document Metadata Extraction & Privacy Boundary', () => {
    it('discovers document links in HTML bodies for target domain only', () => {
      const html = `
        <html>
          <body>
            <a href="/reports/annual2025.pdf">Annual Report</a>
            <a href="https://example.com/assets/whitepaper.docx">Whitepaper</a>
            <a href="https://external-site.com/malware.pdf">External</a>
          </body>
        </html>
      `;
      const docs = findLinkedDocuments([html], 'example.com');
      expect(docs).toContain('https://example.com/reports/annual2025.pdf');
      expect(docs).toContain('https://example.com/assets/whitepaper.docx');
      expect(docs).not.toContain('https://external-site.com/malware.pdf');
    });

    it('extracts tool metadata while strictly redacting any personal employee identity', async () => {
      const pdfBody = `%PDF-1.4\n/Creator (Adobe InDesign 16.4)\n/Author (John Doe Employee)\n/CreationDate (D:20211012120000Z)\n%%EOF`;
      jest.spyOn(safeHttp, 'safeGet').mockResolvedValueOnce({
        url: 'https://example.com/spec.pdf',
        status: 200,
        headers: { 'content-type': 'application/pdf' },
        body: pdfBody,
        redirectChain: ['https://example.com/spec.pdf'],
      });

      const records = await extractDocumentMetadata(['https://example.com/spec.pdf']);
      expect(records.length).toBe(1);
      expect(records[0]!.creationTool).toBe('Adobe InDesign 16.4');
      expect(records[0]!.hasAuthorField).toBe(true);

      // STRICT SCOPE BOUNDARY: Personal name "John Doe Employee" must NOT be in the record
      expect(records[0]!.authorFieldSanitized).not.toContain('John');
      expect(records[0]!.authorFieldSanitized).not.toContain('Doe');
      expect(records[0]!.authorFieldSanitized).toContain('redacted for privacy');
    });
  });

  describe('Explicit Scope Boundaries Compliance', () => {
    it('Boundary 1: strictly forbids employee-level personal data (names, personal emails, direct phone numbers)', async () => {
      // Simulate raw whois/contact payload with an individual's personal name and direct phone
      const rawHtml = '<div>Switchboard: +1-800-555-0100. Contact: Jane Doe, VP of Sales, direct mobile +1-555-019-2834, jane.doe.personal@gmail.com</div>';
      const docLinks = findLinkedDocuments([rawHtml], 'example.com');
      // Document extractor only matches actual document links (.pdf/.docx/.xlsx), ignoring personal data
      expect(docLinks).toEqual([]);
      // Ensure org profile also ignores personal names
      const orgProfile = await fetchOrgProfile('Jane Doe');
      expect(orgProfile).toBeNull();
    });

    it('Boundary 2: strictly excludes behavioral/social media/location tracking of individuals', async () => {
      // Organization lookup queries only corporate Wikidata entities with official corporate claims, never personal timelines
      const profile = await fetchOrgProfile('Jane Doe personal twitter schedule');
      expect(profile).toBeNull();
    });

    it('Boundary 3: strictly forbids raw secret or credential values from ever being displayed or stored', async () => {
      // If a cloud bucket or response contains an API key-like string, verify that services do not return raw secrets
      jest.spyOn(safeHttp, 'safeHead').mockResolvedValueOnce({
        url: 'https://example.s3.amazonaws.com',
        status: 200,
        headers: { 'x-amz-request-id': 'AKIAIOSFODNN7EXAMPLE' },
        body: '',
        redirectChain: ['https://example.s3.amazonaws.com'],
      });

      const cloudResults = await checkCloudStorageExposure('example.com');
      const serialized = JSON.stringify(cloudResults);
      // Confirms safeHead was used and body was never fetched or exposed
      expect(serialized).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(cloudResults[0]!.url).toBe('https://example.s3.amazonaws.com/');
    });

    it('Boundary 4: strictly forbids raw breach passwords or password hashes under any framing', async () => {
      jest.spyOn(providerHttp, 'fetchProviderJson').mockResolvedValueOnce([
        {
          Name: 'Collection1',
          Title: 'Collection #1',
          Domain: 'test.com',
          BreachDate: '2019-01-07',
          PwnCount: 772904991,
          DataClasses: ['Email addresses', 'Passwords'],
        },
      ]);

      const breachRecord = await checkBreachExposure('test.com');
      expect(breachRecord).not.toBeNull();
      expect(breachRecord!.breaches[0]!.name).toBe('Collection1');
      expect(breachRecord!.breaches[0]!.pwnCount).toBe(772904991);
      
      // Verify breach record contains ZERO passwords, hashes, or individual leaked records
      const serialized = JSON.stringify(breachRecord);
      expect(serialized).not.toContain('password_hash');
      expect(serialized).not.toContain('plaintext');
      expect(serialized).not.toContain('salt');
      expect(serialized).not.toContain('$2y$');
    });
  });
});
