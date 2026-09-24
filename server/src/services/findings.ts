import { randomUUID } from 'node:crypto';
import type { DomainScan, Evidence, Finding } from '../../../shared/types';

function evidence(source: string, description: string, confidence: Evidence['confidence'] = 'high'): Evidence {
  return { source, description, confidence, observedAt: new Date().toISOString() };
}

const HEADER_EXPLANATIONS: Record<string, { purpose: string; risk: string; advice: string }> = {
  'content-security-policy': {
    purpose: 'Restricts the resources (scripts, images, styles) that the browser is permitted to load.',
    risk: 'Without CSP, the site lacks a secondary defense layer against cross-site scripting (XSS) and content injection.',
    advice: 'Define a Content-Security-Policy that restricts script origins and object loading.',
  },
  'strict-transport-security': {
    purpose: 'Instructs browsers to always use HTTPS, preventing man-in-the-middle SSL stripping.',
    risk: 'Without HSTS, unencrypted HTTP requests can be intercepted before being redirected.',
    advice: 'Enable Strict-Transport-Security (HSTS) with a sensible max-age once HTTPS stability is confirmed.',
  },
  'x-frame-options': {
    purpose: 'Determines whether the page may be embedded within frames, iframes, or objects.',
    risk: 'Without clickjacking protection, pages could be embedded inside deceptive third-party frames.',
    advice: 'Configure X-Frame-Options to DENY or SAMEORIGIN (or use CSP frame-ancestors).',
  },
  'x-content-type-options': {
    purpose: 'Prevents browsers from MIME-sniffing responses away from the declared Content-Type.',
    risk: 'MIME-type sniffing can lead to arbitrary script execution from uploaded non-executable files.',
    advice: 'Configure X-Content-Type-Options: nosniff across all web server responses.',
  },
  'referrer-policy': {
    purpose: 'Governs how much referrer metadata is transmitted to external destinations.',
    risk: 'Sensitive path parameters or internal URL tokens may leak to external referrers.',
    advice: 'Set Referrer-Policy to strict-origin-when-cross-origin or no-referrer.',
  },
};

export function buildFindings(scan: DomainScan): Finding[] {
  const findings: Finding[] = [];
  const http = scan.categories.http.data as {
    https?: { missingSecurityHeaders?: string[] };
    httpsEnforced?: boolean;
    httpAvailable?: boolean;
  } | undefined;
  const dns = scan.categories.dns.data as { dmarc?: { present?: boolean; policy?: string }; spf?: { present?: boolean } } | undefined;
  const tls = scan.categories.tls.data as { available?: boolean; validTo?: string } | undefined;

  if (http && http.httpsEnforced === false) {
    const isHttpDown = http.httpAvailable === false;
    findings.push({
      id: randomUUID(),
      title: isHttpDown ? 'HTTP service unreachable to verify HTTPS enforcement' : 'HTTPS enforcement was not observed',
      severity: isHttpDown ? 'low' : 'medium',
      kind: 'configuration_weakness',
      category: 'http',
      description: isHttpDown
        ? 'Port 80 (HTTP) was unreachable or did not respond; automated redirection to HTTPS could not be verified.'
        : 'The HTTP response returned content directly without redirecting users to an HTTPS URL.',
      recommendation: 'Ensure all plaintext HTTP requests permanently redirect (301) to canonical HTTPS URLs.',
      evidence: [
        evidence(
          'HTTP response',
          isHttpDown ? 'HTTP port 80 did not return a response' : 'Plain HTTP responded without redirecting to HTTPS',
        ),
      ],
      confidence: 'high',
    });
  }

  for (const header of http?.https?.missingSecurityHeaders ?? []) {
    const info = HEADER_EXPLANATIONS[header.toLowerCase()];
    findings.push({
      id: randomUUID(),
      title: `Missing ${header} response header`,
      severity: 'low',
      kind: 'configuration_weakness',
      category: 'http',
      description: info
        ? `${info.purpose} ${info.risk} This is an observed configuration hygiene finding, not proof of an exploitable vulnerability.`
        : `The HTTPS response did not include ${header}. This is a configuration observation, not proof of a vulnerability.`,
      recommendation: info?.advice ?? `Review whether ${header} is appropriate for the application and configure it deliberately.`,
      evidence: [evidence('HTTPS response headers', `Header ${header} was not observed in HTTPS response`)],
      confidence: 'high',
    });
  }

  if (tls?.available === false) {
    findings.push({
      id: randomUUID(),
      title: 'No usable TLS service was observed',
      severity: 'medium',
      kind: 'configuration_weakness',
      category: 'tls',
      description: 'A TLS handshake could not be completed on standard port 443.',
      recommendation: 'Provide TLS/HTTPS encryption for public web services.',
      evidence: [evidence('TLS handshake', 'No usable TLS service was observed on port 443')],
      confidence: 'medium',
    });
  }

  if (!dns?.spf?.present) {
    findings.push({
      id: randomUUID(),
      title: 'SPF record was not observed',
      severity: 'low',
      kind: 'recommendation',
      category: 'dns',
      description: 'No SPF TXT record was found at the scanned domain. SPF helps receiving mail servers verify authorized senders.',
      recommendation: 'Publish an SPF policy TXT record (e.g. "v=spf1 -all" if no email is sent from this domain).',
      evidence: [evidence('DNS TXT lookup', 'No SPF record was observed')],
      confidence: 'medium',
    });
  }

  if (!dns?.dmarc?.present) {
    findings.push({
      id: randomUUID(),
      title: 'DMARC record was not observed',
      severity: 'low',
      kind: 'recommendation',
      category: 'dns',
      description: 'No DMARC policy was found at _dmarc.<domain>. DMARC protects domain reputation against email spoofing.',
      recommendation: 'Publish a DMARC policy record starting with p=none for monitoring, gradually moving to quarantine or reject.',
      evidence: [evidence('DNS TXT lookup', 'No DMARC record was observed at _dmarc.<domain>')],
      confidence: 'medium',
    });
  }

  if (tls?.validTo) {
    const days = Math.ceil((new Date(tls.validTo).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 30) {
      findings.push({
        id: randomUUID(),
        title: 'Certificate expires soon',
        severity: days <= 7 ? 'medium' : 'low',
        kind: 'configuration_weakness',
        category: 'tls',
        description: `The observed certificate expires in approximately ${days} days.`,
        recommendation: 'Renew the certificate before its validity window ends to avoid browser security warnings.',
        evidence: [evidence('TLS certificate', `Observed valid-to date ${tls.validTo}`)],
        confidence: 'high',
      });
    }
  }

  return findings;
}
