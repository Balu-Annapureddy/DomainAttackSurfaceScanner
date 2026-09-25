import { parseWhoisText, extractReferralServer } from '../services/whois';
import { db } from '../db';
import { evictExpiredScans, createScanRecord, getScanRecord, clearScanStore } from '../services/scanStore';
import { buildFindings } from '../services/findings';
import type { DomainScan } from '../../../shared/types';
import type { TlsResult } from '../services/tls';

describe('Production Hardening & Verification Suite', () => {
  afterAll(async () => {
    await db.close();
  });

  describe('WHOIS Referral Chain & Parser Hardening', () => {
    it('extracts referral server correctly from IANA and registry responses', () => {
      const ianaSample = `
% IANA WHOIS server
refer:        whois.verisign-grs.com
domain:       COM
status:       ACTIVE
`;
      expect(extractReferralServer(ianaSample)).toBe('whois.verisign-grs.com');

      const registrySample = `
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.iana.org/registrar-whois
Registrar WHOIS Server: whois.markmonitor.com
Registrar URL: http://www.markmonitor.com
`;
      expect(extractReferralServer(registrySample)).toBe('whois.markmonitor.com');
    });

    it('ignores referral loops back to whois.iana.org', () => {
      const loopSample = `
refer: whois.iana.org
`;
      expect(extractReferralServer(loopSample)).toBeNull();
    });

    it('parses standard ICANN and RFC 3912 whois fields accurately', () => {
      const sample = `
Domain Name: GOOGLE.COM
Registry Domain ID: 2138514_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.markmonitor.com
Updated Date: 2019-09-09T15:39:04Z
Creation Date: 1997-09-15T04:00:00Z
Registry Expiry Date: 2028-09-14T04:00:00Z
Registrar: MarkMonitor Inc.
Registrar IANA ID: 292
Registrant Organization: Google LLC
Name Server: NS1.GOOGLE.COM
Name Server: NS2.GOOGLE.COM
Name Server: NS3.GOOGLE.COM
Name Server: NS4.GOOGLE.COM
`;
      const parsed = parseWhoisText(sample);
      expect(parsed.registrar).toBe('MarkMonitor Inc.');
      expect(parsed.creationDate).toBe('1997-09-15T04:00:00Z');
      expect(parsed.expiryDate).toBe('2028-09-14T04:00:00Z');
      expect(parsed.registrantOrg).toBe('Google LLC');
      expect(parsed.privacyStatus).toBe('public');
      expect(parsed.nameservers).toEqual(['ns1.google.com', 'ns2.google.com', 'ns3.google.com', 'ns4.google.com']);
    });

    it('identifies privacy proxy redaction patterns correctly', () => {
      const redactedSample = `
Domain Name: TARGET.COM
Registrar: NameCheap, Inc.
Creation Date: 2020-01-01T00:00:00Z
Registry Expiry Date: 2025-01-01T00:00:00Z
Registrant Organization: REDACTED FOR PRIVACY
Name Server: dns1.registrar-servers.com
`;
      const parsed = parseWhoisText(redactedSample);
      expect(parsed.privacyStatus).toBe('redacted');
      expect(parsed.registrantOrg).toBeNull();
    });
  });

  describe('Atomic Quota Consumption & Race Condition Protection', () => {
    it('strictly enforces limit under concurrent tryConsumeQuota calls', async () => {
      const testKey = `test-race-${Date.now()}`;
      const limit = 3;
      const windowMs = 60000;

      // Fire 10 simultaneous consumption attempts
      const attempts = await Promise.all(
        Array.from({ length: 10 }).map(() => db.tryConsumeQuota(testKey, limit, windowMs))
      );

      const allowedCount = attempts.filter((a) => a.allowed).length;
      const deniedCount = attempts.filter((a) => !a.allowed).length;

      expect(allowedCount).toBe(3);
      expect(deniedCount).toBe(7);

      const finalCheck = await db.getQuota(testKey, windowMs);
      expect(finalCheck.scanCount).toBe(3);
    });

    it('resets quota window once windowMs has elapsed', async () => {
      const testKey = `test-window-${Date.now()}`;
      const limit = 1;
      const shortWindowMs = 50; // 50ms window

      const first = await db.tryConsumeQuota(testKey, limit, shortWindowMs);
      expect(first.allowed).toBe(true);

      const second = await db.tryConsumeQuota(testKey, limit, shortWindowMs);
      expect(second.allowed).toBe(false);

      // Wait for window to elapse
      await new Promise((r) => setTimeout(r, 60));

      const third = await db.tryConsumeQuota(testKey, limit, shortWindowMs);
      expect(third.allowed).toBe(true);
    });
  });

  describe('Active ScanStore Eviction', () => {
    beforeEach(() => {
      clearScanStore();
    });

    it('evicts expired records while retaining active ones', () => {
      const activeScan = createScanRecord('active.com');
      const expiredScan = createScanRecord('expired.com');

      // Artificially expire the second scan
      expiredScan.expiresAt = new Date(Date.now() - 1000).toISOString();

      const evicted = evictExpiredScans();
      expect(evicted).toBe(1);

      expect(getScanRecord(activeScan.scanId)).toBeDefined();
      expect(getScanRecord(expiredScan.scanId)).toBeUndefined();
    });
  });

  describe('Security Findings & TLS Certificate Validation', () => {
    it('generates high severity finding when TLS certificate chain is untrusted', () => {
      const invalidTls: TlsResult = {
        available: true,
        authorized: false,
        authorizationError: 'DEPTH_ZERO_SELF_SIGNED_CERT',
        subject: JSON.stringify({ CN: 'untrusted.local' }),
        issuer: JSON.stringify({ CN: 'untrusted.local' }),
        validFrom: new Date(Date.now() - 86400000).toISOString(),
        validTo: new Date(Date.now() + 30 * 86400000).toISOString(),
      };

      const mockScan: DomainScan = {
        scanId: 'test-scan-tls',
        domain: 'untrusted.local',
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        status: 'completed',
        assets: [],
        relationships: [],
        findings: [],
        warnings: [],
        categories: {
          tls: { status: 'completed', data: invalidTls },
          http: { status: 'pending' },
          dns: { status: 'pending' },
          whois: { status: 'pending' },
          subdomains: { status: 'pending' },
          exposure: { status: 'pending' },
          scoring: { status: 'pending' },
        },
      };

      const findings = buildFindings(mockScan);

      const certFinding = findings.find((f: { title: string }) => f.title.includes('TLS certificate chain is untrusted or invalid'));
      expect(certFinding).toBeDefined();
      expect(certFinding?.severity).toBe('high');
      expect(certFinding?.description).toContain('DEPTH_ZERO_SELF_SIGNED_CERT');
    });
  });
});
