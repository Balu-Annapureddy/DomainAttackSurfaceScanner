import { computeExposureScore, computeScoreBreakdown, SCORING_VERSION } from '../services/scoring';
import { buildFindings } from '../services/findings';
import type { DomainScan } from '../../../shared/types';

describe('External Hygiene Score v2', () => {
  const createBaseScan = (): DomainScan => ({
    scanId: 'test-scan-1',
    domain: 'example.com',
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    status: 'completed',
    assets: [],
    relationships: [],
    findings: [],
    warnings: [],
    categories: {
      tls: {
        status: 'completed',
        data: {
          available: true,
          authorized: true,
          validTo: new Date(Date.now() + 90 * 86400000).toISOString(),
          protocol: 'TLSv1.3',
          subjectAltNames: ['example.com'],
          chainComplete: true,
          hasIntermediateCertificate: true,
          hostnameMismatch: false,
        },
      },
      http: {
        status: 'completed',
        data: {
          httpsEnforced: true,
          https: { missingSecurityHeaders: [] },
          cookies: [],
          corsMisconfiguration: false,
        },
      },
      dns: {
        status: 'completed',
        data: {
          addresses: ['93.184.216.34'],
          mx: ['mail.example.com (10)'],
          ns: ['ns1.example.com', 'ns2.example.com'],
          txt: ['v=spf1 -all'],
          cname: [],
          spf: { present: true, policy: 'v=spf1 -all' },
          dmarc: { present: true, policy: 'reject', record: 'v=DMARC1; p=reject' },
          dnssec: { observed: true },
        },
      },
      whois: {
        status: 'completed',
        data: {
          available: true,
          creationDate: '2015-01-01T00:00:00Z',
          privacyStatus: 'redacted',
        },
      },
      subdomains: {
        status: 'completed',
        data: {
          subdomains: ['api.example.com', 'www.example.com'],
          takeoverRisks: [],
        },
      },
      exposure: {
        status: 'completed',
        data: {
          shodan: [],
          breachData: { domain: 'example.com', breaches: [], totalPwnCount: 0 },
        },
      },
      scoring: { status: 'completed' },
    },
  });

  it('returns 100 for a fully evidenced strong posture across all 12 dimensions', () => {
    const scan = createBaseScan();
    const breakdown = computeScoreBreakdown(scan);

    expect(computeExposureScore(scan)).toBe(100);
    expect(breakdown.scoringVersion).toBe(SCORING_VERSION);
    expect(breakdown.totalDeducted).toBe(0);
    // 12 dimensions: 20 + 15 + 15 + 10 + 3 + 15 + 7 + 15 + 5 + 5 + 5 + 5 = 120
    expect(Object.values(breakdown.dimensions).reduce((n, d) => n + d.maxDeduction, 0)).toBe(120);
  });

  it('uses nuanced partial deductions across rebalanced dimensions', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).https.missingSecurityHeaders = [
      'content-security-policy',
    ];
    (scan.categories.dns.data as any).spf = { present: false };
    (scan.categories.dns.data as any).dmarc = { present: false };

    const breakdown = computeScoreBreakdown(scan);

    // CSP -5, SPF -4, DMARC -4 => 13 total, score 87.
    expect(breakdown.totalDeducted).toBe(13);
    expect(breakdown.total).toBe(87);
    expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(5);
    expect(breakdown.dimensions.emailSecurity.deducted).toBe(8);
  });

  it('does not double-count HSTS as both transport and headers', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).https.missingSecurityHeaders = [
      'strict-transport-security',
      'content-security-policy',
    ];

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(4);
    expect(breakdown.dimensions.webSecurityHeaders.deducted).toBe(5);
    expect(breakdown.totalDeducted).toBe(9);
    expect(breakdown.total).toBe(91);
  });

  it('deducts only 5 for HTTP without HTTPS enforcement', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).httpsEnforced = false;

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.httpsEnforcement.deducted).toBe(5);
    expect(breakdown.total).toBe(95);
  });

  it('handles TLS certificate expiry proportionally', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).validTo =
      new Date(Date.now() + 20 * 86400000).toISOString();

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(1);
    expect(breakdown.total).toBe(99);
  });

  it('scores invalid certificate authorization without treating it as TLS absence', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).authorized = false;

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(4);
    expect(breakdown.total).toBe(96);
  });

  it('scores legacy TLS protocol when the protocol is actually observed', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).protocol = 'TLSv1.1';

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.tlsHygiene.deducted).toBe(4);
  });

  it('scores DNSSEC in the dedicated DNSSEC dimension', () => {
    const scan = createBaseScan();
    (scan.categories.dns.data as any).dnssec = { observed: false };

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.dnssecHygiene.deducted).toBe(3);
    expect(breakdown.total).toBe(97);
  });

  it('distinguishes SPF and DMARC policy strength', () => {
    const scan = createBaseScan();
    (scan.categories.dns.data as any).spf = { present: true, policy: 'v=spf1 +all' };
    (scan.categories.dns.data as any).dmarc = { present: true, policy: 'none' };

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.emailSecurity.deducted).toBe(7);
    expect(breakdown.total).toBe(93);
  });

  it('deduplicates CVEs and bounds exposure deductions', () => {
    const scan = createBaseScan();
    (scan.categories.exposure.data as any).shodan = [
      { ports: [80, 3306], vulns: ['CVE-2024-1234', 'CVE-2024-1234'] },
      { ports: [3389], vulns: ['CVE-2024-1234'] },
    ];

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.networkExposure.deducted).toBe(13);
    expect(breakdown.dimensions.networkExposure.observations).toHaveLength(3);
    expect(breakdown.total).toBe(87);
  });

  // ── NEW CATEGORY 1: Certificate Chain Correctness ──────────────────────────
  describe('Category: Certificate Chain Correctness', () => {
    it('deducts points for hostname mismatch and incomplete intermediate chain', () => {
      const scan = createBaseScan();
      (scan.categories.tls.data as any).hostnameMismatch = true;
      (scan.categories.tls.data as any).chainComplete = false;

      const breakdown = computeScoreBreakdown(scan);

      // Hostname mismatch (-5), Incomplete chain (-2) = -7 (max deduction 7)
      expect(breakdown.dimensions.certificateChain.deducted).toBe(7);
      expect(breakdown.dimensions.certificateChain.observations).toHaveLength(2);
      expect(breakdown.total).toBe(93);
    });

    it('does NOT deduct for certificate chain when TLS check failed or was unavailable', () => {
      const scan = createBaseScan();
      scan.categories.tls = { status: 'failed', data: { available: false } };

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.certificateChain.deducted).toBe(0);
      expect(breakdown.dimensions.certificateChain.observations).toHaveLength(0);
    });
  });

  // ── NEW CATEGORY 2: Subdomain Takeover Risk ────────────────────────────────
  describe('Category: Subdomain Takeover Risk', () => {
    it('deducts 15 points for confirmed subdomain takeover', () => {
      const scan = createBaseScan();
      (scan.categories.subdomains.data as any).takeoverRisks = [
        {
          subdomain: 'blog.example.com',
          cname: 'example.github.io',
          service: 'GitHub Pages',
          matchedFingerprint: "There isn't a GitHub Pages site here",
          confirmed: true,
        },
      ];

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.subdomainTakeover.deducted).toBe(15);
      expect(breakdown.dimensions.subdomainTakeover.observations[0]?.description).toContain('GitHub Pages');
      expect(breakdown.total).toBe(85);
    });

    it('does NOT deduct when no takeover is confirmed or check failed', () => {
      const scan = createBaseScan();
      (scan.categories.subdomains.data as any).takeoverRisks = [];

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.subdomainTakeover.deducted).toBe(0);
    });
  });

  // ── NEW CATEGORY 3: Domain & WHOIS Hygiene ─────────────────────────────────
  describe('Category: Domain & WHOIS Hygiene', () => {
    it('deducts softly for freshly registered domain (<30 days) and public contact info', () => {
      const scan = createBaseScan();
      // Registered 10 days ago
      (scan.categories.whois.data as any).creationDate =
        new Date(Date.now() - 10 * 86400000).toISOString();
      (scan.categories.whois.data as any).privacyStatus = 'public';

      const breakdown = computeScoreBreakdown(scan);

      // Recent domain (-2), Public WHOIS (-3) = -5 (max deduction 5)
      expect(breakdown.dimensions.whoisHygiene.deducted).toBe(5);
      expect(breakdown.dimensions.whoisHygiene.observations).toHaveLength(2);
      expect(breakdown.dimensions.whoisHygiene.observations[0]?.description).toContain('soft signal');
      expect(breakdown.total).toBe(95);
    });

    it('does NOT deduct when WHOIS check failed or is unknown', () => {
      const scan = createBaseScan();
      scan.categories.whois = { status: 'failed', data: { available: false } };

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.whoisHygiene.deducted).toBe(0);
    });
  });

  // ── NEW CATEGORY 4: Cookie Security ────────────────────────────────────────
  describe('Category: Cookie Security', () => {
    it('deducts for sensitive session cookies missing Secure and HttpOnly flags', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).cookies = [
        {
          name: 'session_id',
          hasSecure: false,
          hasHttpOnly: false,
          sameSite: null,
          isSessionLikely: true,
          missingFlags: ['Secure', 'HttpOnly', 'SameSite'],
        },
      ];

      const breakdown = computeScoreBreakdown(scan);

      // Missing Secure (-2), Missing HttpOnly (-2), Missing SameSite (-1) = -5
      expect(breakdown.dimensions.cookieSecurity.deducted).toBe(5);
      expect(breakdown.dimensions.cookieSecurity.observations).toHaveLength(3);
      expect(breakdown.total).toBe(95);
    });

    it('does NOT deduct for non-sensitive analytics cookies missing HttpOnly', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).cookies = [
        {
          name: '_ga',
          hasSecure: false,
          hasHttpOnly: false,
          sameSite: null,
          isSessionLikely: false,
          missingFlags: ['Secure', 'HttpOnly', 'SameSite'],
        },
      ];

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.cookieSecurity.deducted).toBe(0);
    });

    it('does NOT deduct when HTTP check failed', () => {
      const scan = createBaseScan();
      scan.categories.http = { status: 'failed' };

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.cookieSecurity.deducted).toBe(0);
    });
  });

  // ── NEW CATEGORY 5: CORS Misconfiguration ──────────────────────────────────
  describe('Category: CORS Misconfiguration', () => {
    it('deducts 5 points for wildcard origin combined with credentials', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).corsMisconfiguration = true;

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.corsConfiguration.deducted).toBe(5);
      expect(breakdown.total).toBe(95);
    });

    it('does NOT deduct for bare wildcard origin without credentials', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).corsMisconfiguration = false;
      (scan.categories.http.data as any).https = {
        headers: {
          'access-control-allow-origin': '*',
          // no credentials header
        },
      };

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.corsConfiguration.deducted).toBe(0);
    });
  });

  // ── NEW CATEGORY 6: Breach Exposure ────────────────────────────────────────
  describe('Category: Breach Exposure', () => {
    it('deducts a flat 5 points when organization breach records are present', () => {
      const scan = createBaseScan();
      (scan.categories.exposure.data as any).breachData = {
        domain: 'example.com',
        breaches: [
          { name: 'Incident1', title: 'Legacy Breach 2018', breachDate: '2018-05-01' },
          { name: 'Incident2', title: 'Old Leak 2020', breachDate: '2020-11-15' },
        ],
        totalPwnCount: 15000,
      };

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.breachExposure.deducted).toBe(5);
      expect(breakdown.total).toBe(95);
    });

    it('does NOT deduct when breach data has no breaches or exposure check failed', () => {
      const scan = createBaseScan();
      (scan.categories.exposure.data as any).breachData = null;

      const breakdown = computeScoreBreakdown(scan);

      expect(breakdown.dimensions.breachExposure.deducted).toBe(0);
    });
  });

  it('never deducts from failed or incomplete categories across all 12 dimensions', () => {
    const scan = createBaseScan();
    scan.categories.tls = {
      status: 'failed',
      data: { available: false, authorized: false, protocol: 'TLSv1.1' },
    };
    scan.categories.http = {
      status: 'failed',
      data: {
        httpsEnforced: false,
        https: { missingSecurityHeaders: ['hsts', 'csp', 'x-frame-options'] },
        corsMisconfiguration: true,
      },
    };
    scan.categories.dns = {
      status: 'pending',
      data: {
        spf: { present: false },
        dmarc: { present: false },
        dnssec: { observed: false },
        ns: [],
      },
    };
    scan.categories.whois = {
      status: 'failed',
      data: { creationDate: new Date().toISOString(), privacyStatus: 'public' },
    };
    scan.categories.subdomains = {
      status: 'failed',
      data: {
        takeoverRisks: [{ confirmed: true, service: 'Heroku', subdomain: 'a.b.com', cname: 'c', matchedFingerprint: 'd' }],
      },
    };
    scan.categories.exposure = {
      status: 'failed',
      data: {
        shodan: [{ ports: [3306], vulns: ['CVE-2024-1234'] }],
        breachData: { breaches: [{ name: 'Test' }] },
      },
    };

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.total).toBe(100);
    expect(breakdown.totalDeducted).toBe(0);
  });

  it('does not penalize unknown CAA or DKIM status because those signals are not collected', () => {
    const scan = createBaseScan();
    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.dimensions.dnssecHygiene.deducted).toBe(0);
    expect(breakdown.dimensions.emailSecurity.deducted).toBe(0);
  });

  it('keeps computeExposureScore and the detailed breakdown identical', () => {
    const scan = createBaseScan();
    (scan.categories.http.data as any).httpsEnforced = false;
    (scan.categories.dns.data as any).dnssec = { observed: false };

    expect(computeExposureScore(scan)).toBe(computeScoreBreakdown(scan).total);
  });

  it('clamps the score to the 0–100 range', () => {
    const scan = createBaseScan();
    (scan.categories.tls.data as any).available = false;
    (scan.categories.tls.data as any).authorized = false;
    (scan.categories.tls.data as any).validTo =
      new Date(Date.now() - 2 * 86400000).toISOString();
    (scan.categories.http.data as any).httpsEnforced = false;
    (scan.categories.http.data as any).https.missingSecurityHeaders = [
      'strict-transport-security',
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'permissions-policy',
      'other-header',
    ];
    (scan.categories.dns.data as any).spf = { present: false };
    (scan.categories.dns.data as any).dmarc = { present: false };
    (scan.categories.dns.data as any).dnssec = { observed: false };
    (scan.categories.dns.data as any).ns = ['ns1.example.com'];
    (scan.categories.dns.data as any).addresses = [];
    (scan.categories.exposure.data as any).shodan = [
      { ports: [21, 3306], vulns: ['CVE-1', 'CVE-2'] },
      { ports: [3389], vulns: ['CVE-3'] },
      { ports: [23], vulns: [] },
    ];

    const breakdown = computeScoreBreakdown(scan);

    expect(breakdown.total).toBeGreaterThanOrEqual(0);
    expect(breakdown.total).toBeLessThanOrEqual(100);
    expect(breakdown.totalDeducted).toBeLessThanOrEqual(120);
  });

  describe('Phase 7 Epistemic Safety: Timeouts vs Confirmed Absence & CVE Confidence', () => {
    it('7.1: TLS timeout does NOT deduct points and finding uses inconclusive language', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).httpAvailable = true;
      (scan.categories.tls.data as any) = {
        available: false,
        outcome: 'connection_failed',
        reason: 'TLS handshake timed out after 5000ms',
      };

      const breakdown = computeScoreBreakdown(scan);
      // TLS hygiene should NOT deduct anything on timeout
      expect(breakdown.dimensions.tlsHygiene.deducted).toBe(0);
      expect(breakdown.dimensions.tlsHygiene.observations).toHaveLength(0);

      const findings = buildFindings(scan);
      // Should NOT claim "Web service operates exclusively over unencrypted HTTP"
      const unencryptedFinding = findings.find(f => f.title.includes('exclusively over unencrypted HTTP'));
      expect(unencryptedFinding).toBeUndefined();

      // If a finding exists, it must use inconclusive language
      const tlsFinding = findings.find(f => f.title.includes('TLS availability could not be verified'));
      expect(tlsFinding).toBeDefined();
      expect(tlsFinding?.confidence).toBe('low');
      expect(tlsFinding?.title).toBe('TLS availability could not be verified during this scan');
    });

    it('7.1: Confirmed absent TLS (e.g. ECONNREFUSED) correctly deducts and claims absence', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any).httpAvailable = true;
      (scan.categories.tls.data as any) = {
        available: false,
        outcome: 'confirmed_absent',
        reason: 'connect ECONNREFUSED 93.184.216.34:443',
      };

      const breakdown = computeScoreBreakdown(scan);
      // Confirmed absence deducts points
      expect(breakdown.dimensions.tlsHygiene.deducted).toBe(5);
      expect(breakdown.dimensions.tlsHygiene.observations[0]?.description).toContain('TLS/HTTPS service was not observed');

      const findings = buildFindings(scan);
      const unencryptedFinding = findings.find(f => f.title.includes('exclusively over unencrypted HTTP'));
      expect(unencryptedFinding).toBeDefined();
      expect(unencryptedFinding?.severity).toBe('high');
      expect(unencryptedFinding?.confidence).toBe('high');
    });

    it('7.1b: HTTP timeout does NOT deduct points and does NOT generate a confident "not enforced" finding', () => {
      const scan = createBaseScan();
      (scan.categories.http.data as any) = {
        httpAvailable: false,
        httpOutcome: 'inconclusive',
        httpsEnforced: undefined,
        https: { missingSecurityHeaders: [] },
      };

      const breakdown = computeScoreBreakdown(scan);
      // Inconclusive HTTP check must not deduct for missing redirect
      const redirectDeduction = breakdown.dimensions.httpsEnforcement.observations.find(o =>
        o.description.includes('not redirected to HTTPS')
      );
      expect(redirectDeduction).toBeUndefined();

      const findings = buildFindings(scan);
      const enforcementFinding = findings.find(f => f.title.includes('HTTPS enforcement was not observed'));
      expect(enforcementFinding).toBeUndefined();
    });

    it('7.3: Shodan-correlated CVE findings have medium confidence and explicit heuristic caveat', () => {
      const scan = createBaseScan();
      (scan.categories.exposure.data as any).shodan = [
        {
          ip: '93.184.216.34',
          ports: [80, 443],
          cpes: [],
          vulns: ['CVE-2023-1234'],
          tags: [],
          available: true,
          hasData: true,
        },
      ];

      const findings = buildFindings(scan);
      const cveFinding = findings.find(f => f.title.includes('CVE-2023-1234'));
      expect(cveFinding).toBeDefined();
      expect(cveFinding?.severity).toBe('high'); // severity unchanged
      expect(cveFinding?.confidence).toBe('medium'); // confidence softened
      expect(cveFinding?.analysis?.whatWasObserved).toContain('automated correlation based on service banner and version fingerprinting, not a confirmed exploit test');
    });
  });
});
