// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { generateNarrativeSummary, generateHumanSecurityAssessment, getHumanScoreBreakdown } from '../lib/narrativeSummary';
import { generateGraphNarrative } from '../lib/graphNarrative';
import FindingsSection from '../components/FindingsSection';
import type { DomainScan, Asset, Relationship, Finding } from '../../../shared/types';

describe('Narrative Generation & Findings Section QA Suite', () => {
  afterEach(cleanup);

  const mockAssets: Asset[] = [
    { id: '1', type: 'DOMAIN', value: 'example.com', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
    { id: '2', type: 'SUBDOMAIN', value: 'api.example.com', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
    { id: '3', type: 'IP', value: '93.184.216.34', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
    { id: '4', type: 'IP', value: '2606:2800:220:1:248:1893:25c8:1946', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
    { id: '5', type: 'NAMESERVER', value: 'a.iana-servers.net', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
    { id: '6', type: 'ORGANIZATION', value: 'Edgecast Inc.', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
    { id: '7', type: 'ASN', value: 'AS15133', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
  ];

  const mockEv = { source: 'DNS', description: 'Observed', confidence: 'high' as const, observedAt: '2026-10-07T00:00:00Z' };

  const mockRelationships: Relationship[] = [
    { fromAssetId: '1', toAssetId: '3', type: 'resolves_to', evidence: mockEv },
    { fromAssetId: '1', toAssetId: '4', type: 'resolves_to', evidence: mockEv },
    { fromAssetId: '3', toAssetId: '7', type: 'belongs_to_asn', evidence: mockEv },
    { fromAssetId: '7', toAssetId: '6', type: 'operated_by', evidence: mockEv },
  ];

  const mockFindings: Finding[] = [
    {
      id: 'f-1',
      title: 'Missing Content-Security-Policy (CSP)',
      severity: 'low',
      kind: 'configuration_weakness',
      category: 'http',
      observationStatus: 'not_observed',
      confidence: 'high',
      description: 'No Content-Security-Policy header was observed in HTTP responses.',
      recommendation: 'Configure a strict Content-Security-Policy header.',
      whyItMatters: 'CSP prevents malicious script execution and data theft.',
      evidence: [
        { source: 'HTTP Header Probe', description: 'Header absent', confidence: 'high', observedAt: '2026-10-07T00:00:00Z' },
      ],
      analysis: {
        whatIsThis: 'Content-Security-Policy is an HTTP response header.',
        whatWasObserved: 'The server responded without a CSP header.',
        howDiscovered: 'Inspecting HTTP response headers from GET /.',
        technicalExplanation: 'Absence of CSP increases exposure to cross-site scripting.',
        whyItMatters: 'Defense-in-depth against client-side injection.',
        securityImpact: 'Potential session hijack if XSS exists.',
        potentialAbuse: 'An attacker could inject JavaScript.',
        remediation: "Add header: Content-Security-Policy: default-src 'self'",
        safeValidation: 'curl -I https://example.com | grep -i content-security-policy',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
      },
    },
    {
      id: 'f-2',
      title: 'Exposed Database Management Port',
      severity: 'high',
      kind: 'configuration_weakness',
      category: 'exposure',
      observationStatus: 'observed',
      confidence: 'high',
      description: 'MySQL port 3306 was observed listening on public IP.',
      recommendation: 'Restrict database port to private VPN access only.',
      whyItMatters: 'Exposing database ports invites brute force and exploit attempts.',
      evidence: [
        { source: 'Shodan InternetDB', description: 'Port 3306 open', confidence: 'high', observedAt: '2026-10-07T00:00:00Z' },
      ],
      analysis: {
        whatIsThis: 'Public database listener on port 3306.',
        whatWasObserved: 'Port 3306 exposed on public perimeter.',
        howDiscovered: 'Passive Shodan InternetDB telemetry snapshot.',
        technicalExplanation: 'Database listeners should never be exposed to public internet.',
        whyItMatters: 'Direct vector for credential stuffing and protocol vulnerabilities.',
        securityImpact: 'Unauthorized database access if authentication fails.',
        potentialAbuse: 'Automated scanners attempt default password dictionaries.',
        remediation: 'Bind database daemon to localhost or private network adapter.',
        safeValidation: 'nc -zv 93.184.216.34 3306',
        references: [],
      },
    },
  ];

  describe('generateNarrativeSummary', () => {
    it('generates coherent prose for hardened domains', () => {
      const scan: DomainScan = {
        scanId: 'test-scan-1',
        domain: 'example.com',
        createdAt: '2026-10-07T00:00:00Z',
        expiresAt: '2026-10-08T00:00:00Z',
        status: 'completed',
        score: 95,
        scoreLabel: 'External Hygiene Score',
        categories: { scoring: { status: 'completed' } } as unknown as DomainScan['categories'],
        assets: mockAssets,
        findings: [],
        relationships: mockRelationships,
        warnings: [],
      };

      const narrative = generateNarrativeSummary(scan);
      expect(narrative).toContain('This scan evaluated the public attack surface of example.com');
      expect(narrative).toContain('external hygiene score of 95/100');
      expect(narrative).toContain('falls in the strong range');
      expect(narrative).toContain('No security weaknesses or configuration issues were observed during this scan.');
    });

    it('generates alert prose for domains with high-severity findings and poor scores', () => {
      const scan: DomainScan = {
        scanId: 'test-scan-2',
        domain: 'vulnerable.org',
        createdAt: '2026-10-07T00:00:00Z',
        expiresAt: '2026-10-08T00:00:00Z',
        status: 'completed',
        score: 40,
        scoreLabel: 'External Hygiene Score',
        categories: { scoring: { status: 'completed' } } as unknown as DomainScan['categories'],
        assets: mockAssets,
        findings: mockFindings,
        relationships: mockRelationships,
        warnings: [],
      };

      const narrative = generateNarrativeSummary(scan);
      expect(narrative).toContain('external hygiene score of 40/100');
      expect(narrative).toContain('falls in the weak range');
      expect(narrative).toContain('Exposed Database Management Port');
      expect(narrative).toContain('Missing Content-Security-Policy (CSP)');
    });

    it('handles edge cases gracefully when assets and findings are empty', () => {
      const emptyScan: DomainScan = {
        scanId: 'empty-1',
        domain: 'empty.com',
        createdAt: '2026-10-07T00:00:00Z',
        expiresAt: '2026-10-08T00:00:00Z',
        status: 'completed',
        score: undefined,
        scoreLabel: 'External Hygiene Score',
        categories: {} as unknown as DomainScan['categories'],
        assets: [],
        findings: [],
        relationships: [],
        warnings: [],
      };

      const narrative = generateNarrativeSummary(emptyScan);
      expect(narrative).toBeDefined();
      expect(narrative).toContain('This scan evaluated the public attack surface of empty.com');
      expect(narrative).toContain('No security weaknesses or configuration issues were observed during this scan.');
      expect(narrative).toContain('No confirmed defensive security controls');
    });

    describe('Infrastructure & Footprint sentence formatting (Phase 7.2)', () => {
      const baseScan: DomainScan = {
        scanId: 'test-infra',
        domain: 'example.com',
        createdAt: '2026-10-07T00:00:00Z',
        expiresAt: '2026-10-08T00:00:00Z',
        status: 'completed',
        score: 90,
        scoreLabel: 'External Hygiene Score',
        categories: { scoring: { status: 'completed' } } as unknown as DomainScan['categories'],
        assets: [],
        findings: [],
        relationships: [],
        warnings: [],
      };

      it('correctly includes BOTH subdomains and IPs without dropping subdomains', () => {
        const scan: DomainScan = {
          ...baseScan,
          assets: [
            { id: '1', type: 'SUBDOMAIN', value: 'sub1.example.com', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
            { id: '2', type: 'SUBDOMAIN', value: 'sub2.example.com', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
            { id: '3', type: 'IP', value: '93.184.216.34', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
          ],
        };
        const narrative = generateHumanSecurityAssessment(scan).whatWeFoundNarrative;
        expect(narrative).toContain('Our passive discovery identified 2 subdomains through public certificate records and 1 public server address.');
      });

      it('correctly handles only subdomains present', () => {
        const scan: DomainScan = {
          ...baseScan,
          assets: [
            { id: '1', type: 'SUBDOMAIN', value: 'sub1.example.com', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
          ],
        };
        const narrative = generateHumanSecurityAssessment(scan).whatWeFoundNarrative;
        expect(narrative).toContain('Our passive discovery identified 1 subdomain through public certificate records.');
        expect(narrative).not.toContain('and');
      });

      it('correctly handles only IPs present', () => {
        const scan: DomainScan = {
          ...baseScan,
          assets: [
            { id: '1', type: 'IP', value: '93.184.216.34', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
            { id: '2', type: 'IP', value: '93.184.216.35', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
          ],
        };
        const narrative = generateHumanSecurityAssessment(scan).whatWeFoundNarrative;
        expect(narrative).toContain('Our passive discovery identified 2 public server addresses.');
        expect(narrative).not.toContain('subdomain');
      });

      it('produces no infrastructure sentence when neither subdomains nor IPs are present', () => {
        const scan: DomainScan = {
          ...baseScan,
          assets: [
            { id: '1', type: 'DOMAIN', value: 'example.com', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
          ],
        };
        const narrative = generateHumanSecurityAssessment(scan).whatWeFoundNarrative;
        expect(narrative).not.toContain('Our passive discovery identified');
      });
    });

    describe('TLS Outcome phrasing in Human Security Assessment', () => {
      const baseScan: DomainScan = {
        scanId: 'test-tls-outcome',
        domain: 'example.com',
        createdAt: '2026-10-07T00:00:00Z',
        expiresAt: '2026-10-08T00:00:00Z',
        status: 'completed',
        categories: { scoring: { status: 'completed' } } as unknown as DomainScan['categories'],
        assets: [],
        findings: [],
        relationships: [],
        warnings: [],
      };

      it('uses confirmed absence wording when outcome is confirmed_absent', () => {
        const scan: DomainScan = {
          ...baseScan,
          categories: {
            ...baseScan.categories,
            tls: {
              status: 'completed',
              data: { available: false, outcome: 'confirmed_absent' },
            },
          } as unknown as DomainScan['categories'],
        };
        const narrative = generateHumanSecurityAssessment(scan).whatWeFoundNarrative;
        expect(narrative).toContain('The domain appears to lack an active HTTPS service on port 443');
        expect(narrative).not.toContain('inconclusive');
      });

      it('uses inconclusive phrasing when outcome is connection_failed', () => {
        const scan: DomainScan = {
          ...baseScan,
          categories: {
            ...baseScan.categories,
            tls: {
              status: 'completed',
              data: { available: false, outcome: 'connection_failed' },
            },
          } as unknown as DomainScan['categories'],
        };
        const narrative = generateHumanSecurityAssessment(scan).whatWeFoundNarrative;
        expect(narrative).toContain('We could not verify whether example.com has HTTPS active during this scan — this check was inconclusive, not a confirmed finding.');
        expect(narrative).not.toContain('appears to lack an active HTTPS service');
      });
    });

    describe('Score breakdown TLS and HTTPS honest inconclusive reporting', () => {
      const baseScanWithBreakdown: DomainScan = {
        scanId: 'test-breakdown-inconclusive',
        domain: 'apple.com',
        createdAt: '2026-10-07T00:00:00Z',
        expiresAt: '2026-10-08T00:00:00Z',
        status: 'completed',
        score: 100,
        scoreLabel: 'External Hygiene Score',
        scoreBreakdown: {
          scoringVersion: 2,
          total: 100,
          totalDeducted: 0,
          dimensions: {
            tlsHygiene: { label: 'TLS Hygiene', maxDeduction: 20, deducted: 0, observations: [] },
            httpsEnforcement: { label: 'HTTPS Enforcement', maxDeduction: 15, deducted: 0, observations: [] },
            webSecurityHeaders: { label: 'Web Security Headers', maxDeduction: 15, deducted: 0, observations: [] },
            emailSecurity: { label: 'Email Security', maxDeduction: 10, deducted: 0, observations: [] },
            dnssecHygiene: { label: 'DNSSEC Hygiene', maxDeduction: 3, deducted: 0, observations: [] },
            networkExposure: { label: 'Network Exposure', maxDeduction: 15, deducted: 0, observations: [] },
            certificateChain: { label: 'Certificate Chain Correctness', maxDeduction: 7, deducted: 0, observations: [] },
            subdomainTakeover: { label: 'Subdomain Takeover Risk', maxDeduction: 15, deducted: 0, observations: [] },
            whoisHygiene: { label: 'Domain & WHOIS Hygiene', maxDeduction: 5, deducted: 0, observations: [] },
            cookieSecurity: { label: 'Cookie Security', maxDeduction: 5, deducted: 0, observations: [] },
            corsConfiguration: { label: 'CORS Misconfiguration', maxDeduction: 5, deducted: 0, observations: [] },
            breachExposure: { label: 'Breach Exposure', maxDeduction: 5, deducted: 0, observations: [] },
          },
        },
        categories: {
          scoring: { status: 'completed' },
          tls: {
            status: 'completed',
            data: { available: false, outcome: 'connection_failed' },
          },
          http: {
            status: 'completed',
            data: { httpOutcome: 'inconclusive', httpsEnforced: undefined },
          },
        } as unknown as DomainScan['categories'],
        assets: [],
        findings: [],
        relationships: [],
        warnings: [],
      };

      it('asserts TLS breakdown text says inconclusive and not confirmed-good when outcome is connection_failed', () => {
        const categories = getHumanScoreBreakdown(baseScanWithBreakdown);
        const tlsCat = categories.find((c) => c.technicalLabel === 'TLS Hygiene');
        expect(tlsCat).toBeDefined();
        expect(tlsCat?.deducted).toBe(0);
        expect(tlsCat?.isInconclusive).toBe(true);
        expect(tlsCat?.isClean).toBe(false);
        expect(tlsCat?.whatWasObserved).toContain('could not be verified during this scan');
        expect(tlsCat?.whatWasObserved).not.toContain('A valid cryptographic certificate was observed');
      });

      it('asserts HTTPS enforcement breakdown text says inconclusive when httpOutcome is inconclusive', () => {
        const categories = getHumanScoreBreakdown(baseScanWithBreakdown);
        const httpsCat = categories.find((c) => c.technicalLabel === 'HTTPS Enforcement');
        expect(httpsCat).toBeDefined();
        expect(httpsCat?.deducted).toBe(0);
        expect(httpsCat?.isInconclusive).toBe(true);
        expect(httpsCat?.isClean).toBe(false);
        expect(httpsCat?.whatWasObserved).toContain('could not be verified during this scan');
        expect(httpsCat?.whatWasObserved).not.toContain('Plain HTTP requests are automatically redirected');
      });

      it('asserts certificate chain breakdown text says inconclusive when TLS connection failed', () => {
        const categories = getHumanScoreBreakdown(baseScanWithBreakdown);
        const certCat = categories.find((c) => c.technicalLabel === 'Certificate Chain Correctness');
        expect(certCat).toBeDefined();
        expect(certCat?.deducted).toBe(0);
        expect(certCat?.isInconclusive).toBe(true);
        expect(certCat?.isClean).toBe(false);
        expect(certCat?.whatWasObserved).toContain('could not be completed during this scan');
        expect(certCat?.whatWasObserved).not.toContain('complete intermediate chain was served');
      });
    });
  });

  describe('generateGraphNarrative', () => {
    it('generates sentence-level topology summary identifying consolidation under single provider', () => {
      const narrative = generateGraphNarrative(mockAssets, mockRelationships);
      expect(narrative).toContain('1 apex domain');
      expect(narrative).toContain('2 IP addresses (1 IPv4, 1 IPv6)');
      expect(narrative).toContain('a.iana-servers.net');
      expect(narrative).toContain("All of this domain's infrastructure is run by a single provider, Edgecast Inc.");
      expect(narrative).toContain('Edgecast Inc.');
      expect(narrative.toLowerCase()).not.toContain('multi-cloud');
      expect(narrative.toLowerCase()).not.toContain('hybrid');
    });

    it('scans a single-provider domain and explicitly asserts the narrative does NOT contain multi-cloud or hybrid', () => {
      const singleProviderAssets: Asset[] = [
        { id: '1', type: 'DOMAIN', value: 'cloudflare-only.com', targetDomain: 'cloudflare-only.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
        { id: '2', type: 'IP', value: '104.21.5.1', targetDomain: 'cloudflare-only.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
        { id: '3', type: 'IP', value: '172.67.140.2', targetDomain: 'cloudflare-only.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
        { id: '4', type: 'ASN', value: 'AS13335', targetDomain: 'cloudflare-only.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
        { id: '5', type: 'ASN', value: 'AS13335 Cloudflare, Inc.', targetDomain: 'cloudflare-only.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
        { id: '6', type: 'ORGANIZATION', value: 'Cloudflare, Inc.', targetDomain: 'cloudflare-only.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
      ];
      const narrative = generateGraphNarrative(singleProviderAssets, []);
      expect(narrative).toContain("All of this domain's infrastructure is run by a single provider, Cloudflare, Inc.");
      expect(narrative.toLowerCase()).not.toContain('multi-cloud');
      expect(narrative.toLowerCase()).not.toContain('hybrid');
    });

    it('identifies multi-cloud distributed network when multiple organizations are involved', () => {
      const multiAssets: Asset[] = [
        ...mockAssets,
        { id: '8', type: 'ORGANIZATION', value: 'Cloudflare, Inc.', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
        { id: '9', type: 'ASN', value: 'AS13335', targetDomain: 'example.com', discoveredAt: '2026-10-07T00:00:00Z', evidence: [] },
      ];
      const narrative = generateGraphNarrative(multiAssets, mockRelationships);
      expect(narrative).toContain('multi-cloud or hybrid infrastructure footprint');
    });

    it('handles empty asset array cleanly', () => {
      const narrative = generateGraphNarrative([], []);
      expect(narrative).toBe('No connected infrastructure assets were discovered during this scan.');
    });
  });

  describe('FindingsSection UI & Copy Compliance', () => {
    it('renders full 12-section technical detail inline by default without requiring an expand click', () => {
      render(<FindingsSection findings={mockFindings} sectionNumber="01" />);

      // Verify finding titles
      expect(screen.getByText('Missing Content-Security-Policy (CSP)')).toBeDefined();
      expect(screen.getByText('Exposed Database Management Port')).toBeDefined();

      // Verify inline technical detail sections are visible by default
      expect(screen.getAllByText('[01] WHAT IS THIS?').length).toBe(2);
      expect(screen.getAllByText('[02] WHAT WAS OBSERVED?').length).toBe(2);
      expect(screen.getAllByText('[03] HOW WAS IT DISCOVERED?').length).toBe(2);
      expect(screen.getAllByText('[09] RECOMMENDED REMEDIATION').length).toBe(2);
      expect(screen.getByText('curl -I https://example.com | grep -i content-security-policy')).toBeDefined();
      expect(screen.getByText('nc -zv 93.184.216.34 3306')).toBeDefined();
    });

    it('supports collapsing and expanding individual findings and all findings', () => {
      render(<FindingsSection findings={mockFindings} sectionNumber="01" />);

      const collapseAllBtn = screen.getByText('COLLAPSE ALL');
      fireEvent.click(collapseAllBtn);

      // After collapse all, detailed inline sections should no longer be visible
      expect(screen.queryByText('[01] WHAT IS THIS?')).toBeNull();

      const expandAllBtn = screen.getByText('EXPAND ALL');
      fireEvent.click(expandAllBtn);

      // After expand all, detailed inline sections are restored
      expect(screen.getAllByText('[01] WHAT IS THIS?').length).toBe(2);
    });

    it('strictly satisfies Phase 3 UI copy requirement: ZERO user-facing occurrences of the word "dossier"', () => {
      const { container } = render(<FindingsSection findings={mockFindings} sectionNumber="01" />);
      const textContent = container.textContent || '';
      expect(textContent.toLowerCase()).not.toContain('dossier');
    });
  });
});
