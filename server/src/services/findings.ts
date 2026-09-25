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
  const httpCategory = scan.categories.http;
  const tlsCategory = scan.categories.tls;
  const dnsCategory = scan.categories.dns;

  const http = httpCategory?.status === 'completed'
    ? (httpCategory.data as {
        http?: { status?: number };
        https?: { missingSecurityHeaders?: string[]; status?: number };
        httpsEnforced?: boolean;
        httpAvailable?: boolean;
        httpsAvailable?: boolean;
      } | undefined)
    : undefined;

  const dns = dnsCategory?.status === 'completed'
    ? (dnsCategory.data as {
        dmarc?: { present?: boolean; policy?: string };
        spf?: { present?: boolean };
        mx?: string[];
      } | undefined)
    : undefined;

  const tls = tlsCategory?.status === 'completed'
    ? (tlsCategory.data as { available?: boolean; validTo?: string; reason?: string; authorized?: boolean; authorizationError?: string } | undefined)
    : undefined;

  // 1. HTTPS Enforcement: ONLY flag if HTTP was active (status > 0) AND did NOT redirect to HTTPS
  if (http && http.httpAvailable === true && http.httpsEnforced === false) {
    findings.push({
      id: randomUUID(),
      title: 'HTTPS enforcement was not observed',
      severity: 'medium',
      kind: 'configuration_weakness',
      category: 'http',
      observationStatus: 'not_observed',
      description: 'The plaintext HTTP response on port 80 returned content directly without redirecting visitors to an encrypted HTTPS URL.',
      whyItMatters: 'Without mandatory HTTPS enforcement, users communicating with the site can have their traffic intercepted or modified via man-in-the-middle attacks (SSL stripping).',
      investigationSteps: [
        'Inspect web server or reverse proxy configuration (e.g. Nginx, Apache, Cloudflare).',
        'Configure an HTTP 301 or 308 permanent redirect from http:// to https://.',
        'Verify that all asset references (scripts, images, stylesheets) load via https://.',
      ],
      recommendation: 'Ensure all plaintext HTTP requests permanently redirect (301) to canonical HTTPS URLs.',
      evidence: [
        evidence(
          'HTTP probe',
          'Port 80 responded with content without redirecting to HTTPS',
          'high',
        ),
      ],
      confidence: 'high',
    });
  }

  // 2. Missing Security Headers (only evaluated if an HTTPS service was observed)
  if (http?.https) {
    for (const header of http.https.missingSecurityHeaders ?? []) {
      const info = HEADER_EXPLANATIONS[header.toLowerCase()];
      findings.push({
        id: randomUUID(),
        title: `Missing ${header} response header`,
        severity: 'low',
        kind: 'configuration_weakness',
        category: 'http',
        observationStatus: 'not_observed',
        description: info
          ? `${info.purpose} ${info.risk} Note: This is an observed configuration hygiene takeaway, not proof of an exploitable flaw.`
          : `The HTTPS response did not include the ${header} header.`,
        whyItMatters: info?.risk ?? 'Defensive response headers provide defense-in-depth against client-side browser attacks.',
        investigationSteps: [
          info?.advice ?? `Review whether ${header} is applicable to this domain.`,
          'Test header deployment in a staging environment to ensure no legitimate functionality is broken.',
        ],
        recommendation: info?.advice ?? `Review whether ${header} is appropriate for the application and configure it deliberately.`,
        evidence: [evidence('HTTPS response headers', `Header ${header} was not observed in HTTPS response headers`, 'high')],
        confidence: 'high',
      });
    }
  }

  // 3. Plaintext HTTP active with NO TLS available on port 443
  if (http?.httpAvailable === true && tls?.available === false && !tls.reason?.includes('timeout') && !tls.reason?.includes('aborted')) {
    findings.push({
      id: randomUUID(),
      title: 'Web service operates exclusively over unencrypted HTTP',
      severity: 'high',
      kind: 'configuration_weakness',
      category: 'tls',
      observationStatus: 'not_observed',
      description: 'The domain responds to HTTP requests on port 80, but no functional TLS listener was observed on port 443.',
      whyItMatters: 'All traffic, passwords, and sensitive cookies transmitted over unencrypted HTTP can be passively sniffed or altered by anyone on the local network path.',
      investigationSteps: [
        'Provision an automated TLS certificate (e.g. Let\'s Encrypt, Cloudflare, or AWS ACM).',
        'Configure the web server to listen on port 443 with TLS 1.2+ protocols.',
      ],
      recommendation: 'Deploy TLS encryption and migrate web services from plaintext HTTP to HTTPS.',
      evidence: [evidence('TLS handshake', 'No TLS listener responded on port 443 while HTTP port 80 was active', 'medium')],
      confidence: 'medium',
    });
  }

  // 3b. TLS Certificate Authorization / Chain Failure
  if (tls?.available === true && tls.authorized === false) {
    const errorDetail = (tls as { authorizationError?: string }).authorizationError || 'Certificate chain verification failed';
    findings.push({
      id: randomUUID(),
      title: 'TLS certificate chain is untrusted or invalid',
      severity: 'high',
      kind: 'configuration_weakness',
      category: 'tls',
      observationStatus: 'observed',
      description: `The TLS certificate offered on port 443 could not be verified by the standard trust store (${errorDetail}). This typically indicates a self-signed certificate, an expired certificate, a name mismatch, or an incomplete intermediate CA chain.`,
      whyItMatters: 'Web browsers and automated API clients will block access or display prominent security warnings, and traffic is vulnerable to man-in-the-middle attacks.',
      investigationSteps: [
        'Inspect the certificate chain using openssl s_client -connect <target>:443 -servername <target> -showcerts.',
        'Ensure intermediate CA certificates are properly bundled in the web server configuration.',
        'Verify that the domain name matches the Common Name (CN) or Subject Alternative Names (SANs).',
      ],
      recommendation: 'Install a valid, publicly trusted TLS certificate with complete intermediate certificate chains.',
      evidence: [evidence('TLS verification', `Certificate authorization error: ${errorDetail}`, 'high')],
      confidence: 'high',
    });
  }

  // 4. Email Authentication: SPF Record
  const hasMailServers = (dns?.mx?.length ?? 0) > 0;
  if (dns && !dns.spf?.present) {
    findings.push({
      id: randomUUID(),
      title: 'SPF record was not observed',
      severity: hasMailServers ? 'medium' : 'low',
      kind: 'recommendation',
      category: 'dns',
      observationStatus: 'not_observed',
      description: hasMailServers
        ? 'No SPF TXT record was observed at the domain, although mail exchanger (MX) records are published.'
        : 'No SPF TXT record was observed at the domain.',
      whyItMatters: 'Sender Policy Framework (SPF) allows domain owners to publish which mail servers are authorized to send email on their behalf, preventing spoofed spam and phishing.',
      investigationSteps: [
        'List all external and internal services that send email from this domain (e.g. Google Workspace, Microsoft 365, CRM, SendGrid).',
        'Construct a valid SPF record (e.g. "v=spf1 include:_spf.google.com ~all") and publish it as a DNS TXT record.',
        hasMailServers ? 'Ensure the record ends with ~all (softfail) or -all (hardfail).' : 'If this domain never sends mail, publish "v=spf1 -all" to prevent spoofing.',
      ],
      recommendation: hasMailServers
        ? 'Publish an SPF policy TXT record listing all legitimate sending IP ranges and providers.'
        : 'Publish a defensive SPF policy (e.g. "v=spf1 -all") if this domain does not originate email.',
      evidence: [evidence('DNS TXT lookup', 'No TXT record starting with v=spf1 was observed', 'high')],
      confidence: 'high',
    });
  }

  // 5. Email Authentication: DMARC Policy
  if (dns && !dns.dmarc?.present) {
    findings.push({
      id: randomUUID(),
      title: 'DMARC policy record was not observed',
      severity: hasMailServers ? 'medium' : 'low',
      kind: 'recommendation',
      category: 'dns',
      observationStatus: 'not_observed',
      description: 'No DMARC policy record was discovered at _dmarc.<domain>.',
      whyItMatters: 'Domain-based Message Authentication, Reporting, and Conformance (DMARC) tells receivers how to handle emails claiming to come from your domain that fail SPF/DKIM verification.',
      investigationSteps: [
        'Publish a TXT record at _dmarc.<target-domain> with policy "v=DMARC1; p=none; rua=mailto:dmarc-reports@<target-domain>".',
        'Review incoming aggregate reports to identify legitimate sending services before escalating policy to p=quarantine or p=reject.',
      ],
      recommendation: 'Publish a DMARC policy record starting with p=none for monitoring, gradually advancing to quarantine or reject.',
      evidence: [evidence('DNS TXT lookup', 'No TXT record discovered at _dmarc.<domain>', 'high')],
      confidence: 'high',
    });
  }

  // 6. Certificate Expiration Horizon
  if (tls?.validTo) {
    const days = Math.ceil((new Date(tls.validTo).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 30) {
      findings.push({
        id: randomUUID(),
        title: days <= 7 ? 'Certificate expires in under 7 days' : 'Certificate expires soon',
        severity: days <= 7 ? 'high' : 'low',
        kind: 'configuration_weakness',
        category: 'tls',
        observationStatus: 'observed',
        description: `The active TLS certificate observed on port 443 expires in approximately ${days} day${days === 1 ? '' : 's'}.`,
        whyItMatters: 'When a TLS certificate expires, browsers display prominent security warnings blocking user access and breaking API integrations.',
        investigationSteps: [
          'Verify automated certificate renewal jobs (e.g. Certbot cron/timer, AWS ACM auto-renewal, Cloudflare SSL).',
          'Check for pending domain validation challenges or DNS verification failures.',
        ],
        recommendation: 'Renew the certificate promptly before expiration to prevent service interruption.',
        evidence: [evidence('TLS certificate inspection', `Observed expiration timestamp: ${tls.validTo} (~${days} days remaining)`, 'high')],
        confidence: 'high',
      });
    }
  }

  return findings;
}
