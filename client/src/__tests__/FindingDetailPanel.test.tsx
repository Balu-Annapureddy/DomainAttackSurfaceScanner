// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import FindingDetailPanel from '../components/FindingDetailPanel';
import type { Finding } from '../../../shared/types';

describe('FindingDetailPanel component', () => {
  afterEach(cleanup);
  const mockFinding: Finding = {
    id: 'f-test-1234',
    title: 'Content-Security-Policy (CSP) header not observed',
    severity: 'low',
    kind: 'configuration_weakness',
    category: 'http',
    observationStatus: 'not_observed',
    confidence: 'high',
    description: 'No Content-Security-Policy header was present in the HTTPS response headers.',
    recommendation: 'Implement a Content-Security-Policy header starting with report-only mode.',
    whyItMatters: 'CSP is the primary browser-enforced defense against XSS attacks.',
    evidence: [
      {
        source: 'HTTPS response headers',
        description: 'Header Content-Security-Policy was not present',
        confidence: 'high',
        observedAt: '2026-10-07T12:00:00.000Z',
      },
    ],
    analysis: {
      whatIsThis: 'Content-Security-Policy restricts resource loading origins.',
      whatWasObserved: 'No CSP header was present in the observed HTTPS response.',
      howDiscovered: 'Passive HTTP probe to HTTPS endpoint.',
      technicalExplanation: 'Without CSP, injected scripts run unrestricted in user browsers.',
      whyItMatters: 'Primary defense-in-depth control against cross-site scripting.',
      securityImpact: 'XSS vulnerabilities can steal session tokens or exfiltrate data.',
      potentialAbuse: 'An adversary exploiting an XSS bug can harvest credentials.',
      remediation: "Add Content-Security-Policy: default-src 'self'",
      safeValidation: 'curl -I https://example.com and inspect headers.',
      references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'],
    },
  };

  it('renders all key 12-section technical dossier sections', () => {
    const handleClose = vi.fn();
    render(<FindingDetailPanel finding={mockFinding} onClose={handleClose} />);

    // Title and metadata
    expect(screen.getByText('Content-Security-Policy (CSP) header not observed')).toBeDefined();
    expect(screen.getByText('LOW SEVERITY')).toBeDefined();
    expect(screen.getByText('CATEGORY: HTTP')).toBeDefined();

    // Key Analysis Sections
    expect(screen.getByText('[01] WHAT IS THIS?')).toBeDefined();
    expect(screen.getByText(mockFinding.analysis!.whatIsThis)).toBeDefined();

    expect(screen.getByText('[02] WHAT DID DASS OBSERVE?')).toBeDefined();
    expect(screen.getByText('[03] HOW WAS IT DISCOVERED?')).toBeDefined();
    expect(screen.getByText('[04] RAW EVIDENCE & PROBES')).toBeDefined();
    expect(screen.getByText('[05] TECHNICAL EXPLANATION')).toBeDefined();
    expect(screen.getByText('[06] WHY DOES IT MATTER?')).toBeDefined();
    expect(screen.getByText('[07] REALISTIC SECURITY IMPACT')).toBeDefined();
    expect(screen.getByText('[08] POTENTIAL ABUSE SCENARIO')).toBeDefined();
    expect(screen.getByText('[09] RECOMMENDED REMEDIATION')).toBeDefined();
    expect(screen.getByText('[10] SAFE VALIDATION')).toBeDefined();
    expect(screen.getByText('[11] STANDARDS & CITATIONS')).toBeDefined();
    expect(screen.getByText('[12] TELEMETRY RECORD')).toBeDefined();
  });

  it('calls onClose when close or dismiss is clicked', () => {
    const handleClose = vi.fn();
    render(<FindingDetailPanel finding={mockFinding} onClose={handleClose} />);

    const dismissBtn = screen.getByText('DISMISS');
    fireEvent.click(dismissBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
