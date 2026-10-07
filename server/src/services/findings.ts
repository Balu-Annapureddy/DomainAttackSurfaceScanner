/**
 * DASS v2 Finding Engine
 *
 * Generates evidence-grounded security findings from completed scan data.
 * Every finding is derived exclusively from observable, passively-collected data.
 * No finding is ever fabricated or generated without supporting evidence.
 *
 * Rule inventory (21 rules):
 *   HTTP/TLS:    1-4   (HTTPS enforcement, HTTP-only, header gaps, TLS chain)
 *   Cert:        5-7   (cert expiry, wildcard cert, weak signature algo)
 *   Email/DNS:   8-14  (SPF present/absent, DMARC present/absent/policy, lookup count)
 *   Exposure:    15-21 (server header, x-powered-by, whois expiry, subdomains, security.txt)
 */

import { randomUUID } from 'node:crypto';
import type { DomainScan, Evidence, Finding, FindingAnalysis } from '../../../shared/types';
import { analyzeSpf } from './spfAnalysis';
import { analyzeDmarc } from './dmarcAnalysis';

// ─── Helpers ────────────────────────────────────────────────────────────────

function ev(
  source: string,
  description: string,
  confidence: Evidence['confidence'] = 'high',
): Evidence {
  return { source, description, confidence, observedAt: new Date().toISOString() };
}

function finding(
  partial: Omit<Finding, 'id'>,
): Finding {
  const whyItMatters = partial.whyItMatters || partial.analysis?.whyItMatters || 'Security configuration observation.';
  const investigationSteps = partial.investigationSteps || [
    partial.recommendation,
    partial.analysis?.safeValidation ?? 'Verify configuration changes in a test environment.',
  ];
  const observationStatus = partial.observationStatus || 'observed';
  return {
    id: randomUUID(),
    whyItMatters,
    investigationSteps,
    observationStatus,
    ...partial,
  };
}

// ─── Security Header Explanations (v1 compatibility & rationale) ────────────

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
  'permissions-policy': {
    purpose: 'Selectively enables or disables browser features and APIs.',
    risk: 'Third-party components could potentially access browser APIs if not restricted.',
    advice: 'Add a Permissions-Policy header restricting camera, microphone, and geolocation.',
  },
};

// ─── Security Header Definitions ────────────────────────────────────────────

interface HeaderDef {
  title: string;
  description: string;
  recommendation: string;
  analysis: FindingAnalysis;
}

const HEADER_DEFINITIONS: Record<string, HeaderDef> = {
  'strict-transport-security': {
    title: 'HTTP Strict-Transport-Security (HSTS) header not observed',
    description: 'The Strict-Transport-Security response header was not present in the HTTPS response headers observed for this domain.',
    recommendation: 'Add a Strict-Transport-Security header with a max-age of at least 31536000 (one year). Consider adding includeSubDomains and preload directives after testing.',
    analysis: {
      whatIsThis: 'HTTP Strict-Transport-Security (HSTS) is a browser security policy that forces all future connections to a domain to use HTTPS, preventing downgrade attacks. It is delivered as an HTTP response header.',
      whatWasObserved: 'No Strict-Transport-Security header was present in the HTTPS response headers observed for this domain.',
      howDiscovered: 'DASS made a passive HTTP request to the HTTPS endpoint and inspected the response headers returned by the server.',
      technicalExplanation: 'Without HSTS, a user who types the domain name without specifying "https://" may first connect over HTTP. An attacker on the same network can intercept this initial plaintext request before the redirect to HTTPS occurs. HSTS instructs browsers to always initiate HTTPS connections after the first visit.',
      whyItMatters: 'HSTS defends against SSL-stripping attacks, where a network-level attacker silently downgrades HTTPS to HTTP. It also prevents browsers from accepting invalid certificates without user warning.',
      securityImpact: 'Without HSTS, users on untrusted networks (public Wi-Fi, compromised routers) may be vulnerable to connection interception on their first HTTP request before the redirect to HTTPS.',
      potentialAbuse: 'An attacker positioned between the user and the network (e.g., on the same Wi-Fi) could intercept the initial HTTP request before the HTTPS redirect, potentially reading or modifying traffic.',
      remediation: 'Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` to your HTTPS responses. Do not set it on HTTP responses. Test with max-age=300 first, then increase.',
      safeValidation: 'After deployment, verify using curl -I https://<domain> or browser developer tools that the header is present. Check https://hstspreload.org/ for preload eligibility.',
      references: [
        'https://www.rfc-editor.org/rfc/rfc6797',
        'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
        'https://owasp.org/www-project-secure-headers/',
      ],
    },
  },
  'content-security-policy': {
    title: 'Content-Security-Policy (CSP) header not observed',
    description: 'No Content-Security-Policy header was present in the HTTPS response headers observed for this domain.',
    recommendation: 'Implement a Content-Security-Policy header. Start with a report-only policy to identify violations before enforcing, then progressively tighten.',
    analysis: {
      whatIsThis: 'Content-Security-Policy (CSP) is an HTTP response header that controls which resources (scripts, styles, images, frames) a browser is allowed to load for a page. It is the primary browser-enforced defence against Cross-Site Scripting (XSS) attacks.',
      whatWasObserved: 'No Content-Security-Policy header was present in the HTTPS response headers returned by this domain.',
      howDiscovered: 'DASS made a passive HTTP request to the HTTPS endpoint and inspected the response headers.',
      technicalExplanation: 'Without CSP, if an attacker manages to inject malicious JavaScript into a page (via an XSS vulnerability, third-party library compromise, or supply chain attack), the browser will execute it with full access to the page\'s DOM, cookies, and storage.',
      whyItMatters: 'CSP is the most effective control for limiting the impact of XSS and data injection attacks. Without it, successful script injection gives attackers the ability to steal session tokens, credentials, or sensitive data displayed on the page.',
      securityImpact: 'Absence of CSP means any XSS vulnerability in the application, or a compromised third-party script, can exfiltrate data or perform actions as the authenticated user without restriction.',
      potentialAbuse: 'An attacker who identifies an XSS vulnerability or compromises a third-party JavaScript dependency could inject malicious scripts that run freely in users\' browsers, harvesting credentials or redirecting sessions.',
      remediation: 'Begin with `Content-Security-Policy-Report-Only: default-src \'self\'` to identify violations without breaking the site. Gradually tighten the policy and switch to enforcement mode (`Content-Security-Policy`).',
      safeValidation: 'Use https://csp-evaluator.withgoogle.com/ to assess policy quality. Check browser developer console for CSP violation reports after deployment.',
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
        'https://owasp.org/www-project-secure-headers/',
        'https://csp-evaluator.withgoogle.com/',
      ],
    },
  },
  'x-frame-options': {
    title: 'X-Frame-Options header not observed',
    description: 'No X-Frame-Options header was present in the HTTPS response headers observed for this domain.',
    recommendation: 'Add `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN` to prevent the page from being embedded in iframes on external sites.',
    analysis: {
      whatIsThis: 'X-Frame-Options is an HTTP response header that instructs browsers whether the page is allowed to be displayed inside an iframe, frame, or object element on another domain.',
      whatWasObserved: 'No X-Frame-Options header was present in the HTTPS response headers returned by this domain.',
      howDiscovered: 'DASS made a passive HTTP request to the HTTPS endpoint and inspected the response headers.',
      technicalExplanation: 'Without X-Frame-Options, an attacker can embed this page inside a hidden or transparent iframe on their own site. Users interacting with what they think is the attacker\'s page are actually interacting with this domain\'s interface — a technique called clickjacking.',
      whyItMatters: 'Clickjacking can trick authenticated users into performing unintended actions (e.g., clicking "Confirm transfer", "Grant permissions") without realising it, because the legitimate page is overlaid invisibly.',
      securityImpact: 'Authenticated users visiting a malicious page that embeds this domain in an iframe could be deceived into performing account actions, granting permissions, or clicking UI elements without their knowledge.',
      potentialAbuse: 'An attacker creates a malicious page that invisibly embeds this domain\'s login or action page in a transparent iframe positioned over a decoy button. The user clicks the decoy but actually clicks the hidden authenticated interface.',
      remediation: 'Add `X-Frame-Options: DENY` to all responses. If same-origin embedding is needed (e.g., for internal dashboards), use `SAMEORIGIN`. Note: modern browsers also support `Content-Security-Policy: frame-ancestors \'none\'` as a more flexible equivalent.',
      safeValidation: 'Use curl -I https://<domain> or browser developer tools to confirm the header is present. Test by attempting to embed the page in an iframe from another domain.',
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
        'https://owasp.org/www-community/attacks/Clickjacking',
        'https://owasp.org/www-project-secure-headers/',
      ],
    },
  },
  'x-content-type-options': {
    title: 'X-Content-Type-Options header not observed',
    description: 'No X-Content-Type-Options header was present in the HTTPS response headers observed for this domain.',
    recommendation: 'Add `X-Content-Type-Options: nosniff` to all HTTP responses to prevent MIME-type sniffing by browsers.',
    analysis: {
      whatIsThis: 'X-Content-Type-Options is an HTTP response header that disables MIME-type sniffing in browsers. When set to "nosniff", the browser uses only the declared Content-Type header and will not guess the content type from the file contents.',
      whatWasObserved: 'No X-Content-Type-Options: nosniff header was present in the HTTPS response headers returned by this domain.',
      howDiscovered: 'DASS made a passive HTTP request to the HTTPS endpoint and inspected the response headers.',
      technicalExplanation: 'Without this header, some browsers may interpret response content differently from its declared MIME type. For example, a browser might execute a file declared as "text/plain" as JavaScript if it looks like JavaScript code. This can be exploited when an attacker can upload or control response content.',
      whyItMatters: 'MIME-type sniffing attacks are particularly relevant when user-supplied content (uploads, comments) is served from the same domain. An attacker could craft a file that looks like a benign type but is executed as a script.',
      securityImpact: 'If the application serves user-controlled content without strict MIME typing, an attacker could potentially cause a browser to execute their content as an unexpected type, enabling cross-site scripting in some scenarios.',
      potentialAbuse: 'An attacker who can upload content to the domain could craft files that browsers would MIME-sniff as executable types (e.g., JavaScript), bypassing declared content type restrictions.',
      remediation: 'Add `X-Content-Type-Options: nosniff` to all HTTP responses. This is a single directive with no configuration required.',
      safeValidation: 'Verify the header is present on all responses using curl -I or browser developer tools. This header should have no visible effect on legitimate functionality.',
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
        'https://owasp.org/www-project-secure-headers/',
      ],
    },
  },
  'referrer-policy': {
    title: 'Referrer-Policy header not observed',
    description: 'No Referrer-Policy header was present in the HTTPS response headers observed for this domain.',
    recommendation: 'Add `Referrer-Policy: strict-origin-when-cross-origin` or a stricter policy to control how much URL information is included in requests to other origins.',
    analysis: {
      whatIsThis: 'The Referrer-Policy HTTP header controls how much information from the current page\'s URL is sent in the Referer header when navigating to another page or making requests. Without it, browsers may send full URLs as referrers by default.',
      whatWasObserved: 'No Referrer-Policy header was present in the HTTPS response headers returned by this domain.',
      howDiscovered: 'DASS made a passive HTTP request to the HTTPS endpoint and inspected the response headers.',
      technicalExplanation: 'Without a Referrer-Policy, browser defaults vary. In many configurations, the full URL of the current page (including query parameters) is sent as the Referer header to external sites. If pages contain sensitive tokens, session IDs, or user data in their URLs, this information can leak to third parties.',
      whyItMatters: 'URL query parameters often contain session tokens, password reset tokens, search terms, or user IDs. When users click links to external sites, these values may be exposed to the destination site via the Referer header.',
      securityImpact: 'Sensitive URL parameters (authentication tokens, search terms, personal data) may be inadvertently disclosed to third-party sites, analytics services, or CDN providers through the Referer header.',
      potentialAbuse: 'A malicious or compromised third-party resource loaded by the page (analytics, fonts, advertising) could observe sensitive URL parameters transmitted in the Referer header.',
      remediation: 'Add `Referrer-Policy: strict-origin-when-cross-origin` (sends origin only for cross-origin requests, full URL for same-origin). For stricter privacy: `no-referrer` or `same-origin`.',
      safeValidation: 'Verify the header is present using curl -I or browser developer tools. Confirm that legitimate analytics and link tracking still function as expected after deployment.',
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy',
        'https://owasp.org/www-project-secure-headers/',
        'https://www.w3.org/TR/referrer-policy/',
      ],
    },
  },
  'permissions-policy': {
    title: 'Permissions-Policy header not observed',
    description: 'No Permissions-Policy header was present in the HTTPS response headers observed for this domain.',
    recommendation: 'Add a Permissions-Policy header to explicitly restrict access to browser features (camera, microphone, geolocation) that your application does not need.',
    analysis: {
      whatIsThis: 'The Permissions-Policy (formerly Feature-Policy) HTTP header allows a web application to selectively enable or disable browser APIs and features, such as geolocation, camera, microphone, and payment APIs.',
      whatWasObserved: 'No Permissions-Policy header was present in the HTTPS response headers returned by this domain.',
      howDiscovered: 'DASS made a passive HTTP request to the HTTPS endpoint and inspected the response headers.',
      technicalExplanation: 'Without Permissions-Policy, third-party content embedded in the page (iframes, ads, widgets) retains access to any browser features the user has previously granted permission for. This can allow third-party content to silently access the camera, microphone, or location.',
      whyItMatters: 'If any third-party scripts or iframes are loaded in the application, they inherit the full set of browser feature permissions unless explicitly restricted. This is a defence-in-depth measure.',
      securityImpact: 'Third-party content embedded in the page could access sensitive browser APIs (camera, microphone, geolocation) without the user\'s explicit knowledge, if the user has previously granted these permissions to the domain.',
      potentialAbuse: 'A compromised or malicious third-party script embedded on the page could silently access browser APIs to harvest location data or activate camera/microphone access.',
      remediation: 'Add a restrictive policy: `Permissions-Policy: camera=(), microphone=(), geolocation=()` to deny access to features not needed. Expand the policy only for APIs your application explicitly uses.',
      safeValidation: 'Use browser developer tools to verify the header is present. Test that any legitimate use of browser APIs (e.g., geolocation for maps) still functions after applying the policy.',
      references: [
        'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy',
        'https://owasp.org/www-project-secure-headers/',
        'https://www.w3.org/TR/permissions-policy/',
      ],
    },
  },
};

// Ordered list of headers to check (priority order for scoring purposes)
const SECURITY_HEADERS_ORDERED = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Generate all security findings for a completed scan.
 * Only run after all scan categories have finished.
 */
export function buildFindings(scan: DomainScan): Finding[] {
  const findings: Finding[] = [];

  const httpCategory = scan.categories.http;
  const tlsCategory = scan.categories.tls;
  const dnsCategory = scan.categories.dns;
  const whoisCategory = scan.categories.whois;
  const subdomainsCategory = scan.categories.subdomains;
  const exposureCategory = scan.categories.exposure;

  // ── Extract scan data ─────────────────────────────────────────────────────

  const http = httpCategory?.status === 'completed'
    ? (httpCategory.data as {
        httpsEnforced?: boolean;
        httpAvailable?: boolean;
        httpsAvailable?: boolean;
        httpRedirectsToHttps?: boolean;
        worryingHeaders?: string[];
        http?: { available?: boolean };
        https?: {
          headers?: Record<string, string>;
          missingSecurityHeaders?: string[];
          presentSecurityHeaders?: string[];
          server?: string;
          poweredBy?: string | null;
          authorized?: boolean;
        };
      } | undefined)
    : undefined;

  const tls = tlsCategory?.status === 'completed'
    ? (tlsCategory.data as {
        available?: boolean;
        authorized?: boolean;
        validTo?: string;
        validFrom?: string;
        issuer?: string;
        subject?: string;
        protocol?: string;
        subjectAltNames?: string[];
        signatureAlgorithm?: string;
      } | undefined)
    : undefined;

  const dns = dnsCategory?.status === 'completed'
    ? (dnsCategory.data as {
        spf?: { present?: boolean; policy?: string };
        dmarc?: { present?: boolean; policy?: string; record?: string };
        mx?: string[];
        addresses?: string[];
      } | undefined)
    : undefined;

  const whois = whoisCategory?.status === 'completed'
    ? (whoisCategory.data as {
        expiryDate?: string | null;
        registrar?: string | null;
        creationDate?: string | null;
        nameservers?: string[];
      } | undefined)
    : undefined;

  const subdomains = subdomainsCategory?.status === 'completed'
    ? (subdomainsCategory.data as {
        subdomains?: string[];
        total?: number;
        available?: boolean;
      } | undefined)
    : undefined;

  const exposure = exposureCategory?.status === 'completed'
    ? (exposureCategory.data as {
        checks?: Array<{ path: string; status: number; present: boolean }>;
      } | undefined)
    : undefined;

  // ── SPF & DMARC policy analysis ───────────────────────────────────────────

  const spfRecord = dns?.spf?.policy; // full SPF record string from DNS TXT
  const dmarcRecord = dns?.dmarc?.record; // full DMARC record string from _dmarc.<domain>
  const spf = analyzeSpf(spfRecord);
  const dmarc = analyzeDmarc(dmarcRecord);
  const hasMx = (dns?.mx ?? []).length > 0;
  const domain = scan.domain;

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 1: HTTPS enforcement was not observed
  // ════════════════════════════════════════════════════════════════════════════

  if (http && http.httpAvailable === true && http.httpsEnforced === false) {
    findings.push(finding({
      title: 'HTTPS enforcement was not observed',
      severity: 'medium',
      kind: 'configuration_weakness',
      category: 'http',
      observationStatus: 'not_observed',
      description: 'The plaintext HTTP response on port 80 returned content directly without redirecting visitors to an encrypted HTTPS URL. Note: This is an observed configuration hygiene takeaway, not proof of an exploitable flaw.',
      whyItMatters: 'Without mandatory HTTPS enforcement, users communicating with the site can have their traffic intercepted or modified via man-in-the-middle attacks (SSL stripping).',
      investigationSteps: [
        'Inspect web server or reverse proxy configuration (e.g. Nginx, Apache, Cloudflare).',
        'Configure an HTTP 301 or 308 permanent redirect from http:// to https://.',
        'Verify that all asset references (scripts, images, stylesheets) load via https://.',
      ],
      recommendation: 'Ensure all plaintext HTTP requests permanently redirect (301) to canonical HTTPS URLs.',
      confidence: 'high',
      evidence: [
        ev('HTTP probe', 'Port 80 responded with content without redirecting to HTTPS', 'high'),
      ],
      analysis: {
        whatIsThis: 'HTTP-to-HTTPS redirection is a server-side configuration that automatically upgrades any unencrypted HTTP connection to the secure HTTPS equivalent. Without it, users who type a domain name without "https://" may receive an unencrypted response.',
        whatWasObserved: `The HTTP endpoint at http://${domain} was observed responding with content directly, without issuing an HTTP 301/302 redirect to the HTTPS endpoint.`,
        howDiscovered: `DASS sent a passive HTTP probe to http://${domain} and examined the response status code and Location header to determine whether a redirect to HTTPS was issued.`,
        technicalExplanation: 'When a browser connects to http:// without a redirect, all data exchanged — including any cookies, form submissions, or session tokens — travels in plaintext. Even if the page only serves static content, cookies marked without the Secure flag will be transmitted unencrypted.',
        whyItMatters: 'Any user who reaches this domain over HTTP receives an unencrypted connection. On shared or monitored networks, this exposes page content and potentially session state to observers on the same network path.',
        securityImpact: 'Users on public Wi-Fi or corporate monitored networks may have their HTTP session contents observed. If cookies are transmitted over HTTP (even cookies without Secure flag), they can be captured.',
        potentialAbuse: 'A network-positioned attacker (e.g., on the same Wi-Fi network) can observe unencrypted HTTP traffic, potentially capturing session cookies or form data before a user manually switches to HTTPS.',
        remediation: 'In Nginx: add `return 301 https://$host$request_uri;` to the HTTP server block. In Apache: use a RewriteRule or Redirect directive. In Cloudflare: enable "Always Use HTTPS" in SSL/TLS settings. After redirecting, also add the HSTS header.',
        safeValidation: `Run: curl -I http://${domain} and verify the response is HTTP 301 with a Location header pointing to https://${domain}.`,
        references: [
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections',
          'https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/02-Testing_for_Improper_Certificate_Validity',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 2: Web service accessible over HTTP without any TLS
  // ════════════════════════════════════════════════════════════════════════════

  if (http?.httpAvailable && !tls?.available) {
    findings.push(finding({
      title: 'Web service operates exclusively over unencrypted HTTP',
      severity: 'high',
      kind: 'configuration_weakness',
      category: 'http',
      description: `An HTTP service was observed at http://${domain} but no HTTPS endpoint is available. All communication with this domain occurs over an unencrypted channel.`,
      recommendation: 'Obtain a TLS certificate (e.g., from Let\'s Encrypt at no cost) and configure HTTPS. Redirect all HTTP traffic to HTTPS and add HSTS.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('HTTP probe', `HTTP service observed responding at http://${domain}.`),
        ev('TLS probe', `No TLS/HTTPS service was observed at https://${domain}.`),
      ],
      analysis: {
        whatIsThis: 'TLS (Transport Layer Security) encrypts data in transit between a browser and a web server, preventing passive eavesdropping and active tampering. A service without HTTPS transmits all data — including any credentials, session tokens, and page content — as readable plaintext.',
        whatWasObserved: `An HTTP web service was observed responding at http://${domain}. No TLS certificate or HTTPS endpoint was observed when probing port 443.`,
        howDiscovered: 'DASS performed a passive HTTP probe (port 80) and a TLS handshake probe (port 443) and recorded the results.',
        technicalExplanation: 'HTTP transmits all data as plaintext. Any device between the client and server — including ISP routers, Wi-Fi access points, and corporate proxies — can read or modify the content in transit. This affects all users of the service, not just those on untrusted networks.',
        whyItMatters: 'Without encryption, authentication credentials, session tokens, and sensitive data transmitted by users are exposed to anyone who can observe network traffic on the path between the user and the server.',
        securityImpact: 'All users of this domain are exposed to passive traffic observation by network intermediaries. Any authentication performed over HTTP can be captured. Form data, session cookies, and page content are all readable in transit.',
        potentialAbuse: 'A passive network observer (e.g., on the same Wi-Fi network, or at an ISP level) can record credentials, session tokens, and sensitive user data without any active attack. An active attacker can modify page content in transit (e.g., inject scripts).',
        remediation: 'Obtain a free TLS certificate from Let\'s Encrypt (https://letsencrypt.org/) using Certbot. Configure your web server for HTTPS and redirect all HTTP traffic to HTTPS. Add HSTS.',
        safeValidation: `After deploying TLS, verify with: curl -I https://${domain} (should return 200 or redirect). Check the certificate using: openssl s_client -connect ${domain}:443.`,
        references: [
          'https://letsencrypt.org/',
          'https://www.rfc-editor.org/rfc/rfc8446',
          'https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 3: TLS certificate chain not trusted
  // ════════════════════════════════════════════════════════════════════════════

  if (tls?.available && tls.authorized === false) {
    const errorDetail = (tls as { authorizationError?: string }).authorizationError || 'Certificate chain verification failed';
    findings.push(finding({
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
      confidence: 'high',
      evidence: [
        ev('TLS verification', `Certificate authorization error: ${errorDetail}`, 'high'),
      ],
      analysis: {
        whatIsThis: 'A TLS certificate authenticates the identity of a server and enables encrypted communication. For a certificate to be trusted, it must be signed by a Certificate Authority (CA) that is in the operating system\'s or browser\'s trust store, and the full chain from the certificate to the root CA must be valid.',
        whatWasObserved: `The TLS certificate presented by ${domain} completed a handshake but failed authorization (${errorDetail}) — the certificate chain could not be validated against trusted root certificates.`,
        howDiscovered: 'DASS performed a TLS handshake with the server, examining the presented certificate chain and attempting to validate it against standard root certificate stores.',
        technicalExplanation: 'Certificate chain failures occur when: the certificate is self-signed (no CA), the CA is not in the public trust store, intermediate CA certificates are missing from the server configuration, the certificate has expired, or the hostname does not match the certificate\'s Subject Alternative Names.',
        whyItMatters: 'Browsers warn users about untrusted certificates with prominent security warnings. Users who bypass these warnings are susceptible to man-in-the-middle attacks, as the server\'s identity cannot be verified.',
        securityImpact: 'Users receive browser security warnings when visiting the domain. Those who bypass the warning cannot verify they are communicating with the genuine server. An attacker with a network position could substitute their own certificate and intercept traffic.',
        potentialAbuse: 'On a network where the attacker controls routing, a man-in-the-middle attack becomes trivial — an attacker can substitute their own certificate. Since users are already trained to ignore warnings for this domain, this may go unnoticed.',
        remediation: 'Replace the certificate with one from a publicly trusted CA. Let\'s Encrypt provides free, automatically-renewing certificates. Ensure all intermediate certificates are included in the certificate bundle served by the web server.',
        safeValidation: `Verify the certificate chain using: openssl s_client -connect ${domain}:443 -showcerts. Check for any "verify error" lines in the output.`,
        references: [
          'https://letsencrypt.org/',
          'https://www.rfc-editor.org/rfc/rfc5280',
          'https://developer.mozilla.org/en-US/docs/Web/Security/Certificate_Transparency',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 4: Security response headers missing (one finding per header)
  // ════════════════════════════════════════════════════════════════════════════

  const missingHeaders: string[] = [];
  if (http?.https?.missingSecurityHeaders) {
    missingHeaders.push(...http.https.missingSecurityHeaders.map((h) => h.toLowerCase()));
  } else if (http?.https?.headers) {
    const observed = new Set(Object.keys(http.https.headers).map((h) => h.toLowerCase()));
    for (const h of SECURITY_HEADERS_ORDERED) {
      if (!observed.has(h)) missingHeaders.push(h);
    }
  }

  for (const header of SECURITY_HEADERS_ORDERED) {
    if (!missingHeaders.includes(header)) continue;
    const def = HEADER_DEFINITIONS[header];
    if (!def) continue;

    const exp = HEADER_EXPLANATIONS[header];
    const desc = exp
      ? `${exp.purpose} ${exp.risk} Note: This is an observed configuration hygiene takeaway, not proof of an exploitable flaw.`
      : def.description;

    findings.push(finding({
      title: `Missing ${header} response header`,
      severity: 'low',
      kind: 'configuration_weakness',
      category: 'http',
      description: desc,
      recommendation: exp?.advice ?? def.recommendation,
      confidence: 'high',
      observationStatus: 'not_observed',
      whyItMatters: exp?.risk ?? 'Defensive response headers provide defense-in-depth against client-side browser attacks.',
      investigationSteps: [
        exp?.advice ?? `Review whether ${header} is applicable to this domain.`,
        'Test header deployment in a staging environment to ensure no legitimate functionality is broken.',
      ],
      evidence: [
        ev('HTTPS response headers', `Header ${header} was not observed in HTTPS response headers`, 'high'),
      ],
      analysis: def.analysis,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 5: Certificate expiration
  // ════════════════════════════════════════════════════════════════════════════

  if (tls?.available && tls.validTo) {
    const expiryMs = Date.parse(tls.validTo);
    if (!isNaN(expiryMs)) {
      const daysRemaining = Math.floor((expiryMs - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 30 && daysRemaining >= 0) {
        const severity = daysRemaining <= 7 ? 'high' : 'low';
        findings.push(finding({
          title: `TLS certificate expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
          severity,
          kind: 'potential_risk',
          category: 'tls',
          description: `The TLS certificate for ${domain} expires on ${tls.validTo}. In ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}, browsers will display a certificate-expired error to all users.`,
          recommendation: 'Renew the TLS certificate before it expires. If using Let\'s Encrypt with Certbot, ensure auto-renewal is correctly configured (`certbot renew --dry-run`).',
          confidence: 'high',
          observationStatus: 'observed',
          evidence: [
            ev('TLS certificate', `Certificate valid to: ${tls.validTo}. Days remaining: ${daysRemaining}.`),
          ],
          analysis: {
            whatIsThis: 'TLS certificates have a fixed validity period (typically 90 days for Let\'s Encrypt, up to 1 year for commercial CAs). Once expired, all browsers display a prominent security warning and many refuse to connect, effectively making the site unavailable.',
            whatWasObserved: `The TLS certificate for ${domain} has a validity end date of ${tls.validTo}. This is ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} from now.`,
            howDiscovered: `DASS performed a TLS handshake with ${domain} and read the "Not After" field from the certificate.`,
            technicalExplanation: 'Browsers enforce certificate validity dates strictly. On the expiry date, browsers will display "Your connection is not private" (Chrome) or equivalent warnings. HSTS-enabled domains that expire become completely inaccessible without browser override.',
            whyItMatters: 'A certificate expiry causes an immediate availability incident — all users receive browser security warnings and most will not proceed. This is fully preventable with automated renewal.',
            securityImpact: `If not renewed before ${tls.validTo}, all users visiting ${domain} will receive certificate expiry warnings. HSTS preloaded domains may become inaccessible entirely.`,
            potentialAbuse: 'Certificate expiry itself is not directly exploitable, but a lapsed certificate may be a signal that certificate management is not automated, increasing the risk of future lapses.',
            remediation: 'Renew the certificate immediately. For Let\'s Encrypt: run `certbot renew`. Verify auto-renewal is working with `certbot renew --dry-run`. For commercial certificates: initiate the renewal process with your CA.',
            safeValidation: `After renewal, verify the new expiry date: openssl s_client -connect ${domain}:443 | openssl x509 -noout -dates`,
            references: [
              'https://letsencrypt.org/docs/certificate-lifetime/',
              'https://community.letsencrypt.org/t/certbot-renew-docs',
            ],
          },
        }));
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 6: Wildcard TLS certificate observed
  // ════════════════════════════════════════════════════════════════════════════

  if (tls?.available && tls.subjectAltNames) {
    const wildcards = tls.subjectAltNames.filter((san) => san.startsWith('*.'));
    if (wildcards.length > 0) {
      findings.push(finding({
        title: 'Wildcard TLS certificate observed',
        severity: 'informational',
        kind: 'observation',
        category: 'tls',
        description: `The TLS certificate for ${domain} includes wildcard Subject Alternative Names: ${wildcards.join(', ')}. A single private key protects all subdomains matching the wildcard pattern.`,
        recommendation: 'Wildcard certificates are widely used. If a wildcard certificate\'s private key is compromised, all subdomains sharing it are affected. Consider per-service certificates for higher-sensitivity subdomains.',
        confidence: 'high',
        observationStatus: 'observed',
        evidence: [
          ev('TLS certificate SANs', `Wildcard SANs observed: ${wildcards.join(', ')}.`),
        ],
        analysis: {
          whatIsThis: 'A wildcard TLS certificate secures all first-level subdomains of a domain (e.g., *.example.com covers api.example.com, mail.example.com, etc.) using a single certificate and private key.',
          whatWasObserved: `The TLS certificate presented by ${domain} contains wildcard Subject Alternative Names: ${wildcards.join(', ')}.`,
          howDiscovered: `DASS performed a TLS handshake with ${domain} and read the Subject Alternative Names (SANs) from the certificate.`,
          technicalExplanation: 'Wildcard certificates are operationally convenient but create a shared trust boundary. If the private key associated with the certificate is compromised (e.g., via server breach, insecure key storage, or deployment pipeline exposure), all subdomains protected by that certificate are simultaneously affected.',
          whyItMatters: 'This is an informational observation, not a vulnerability. However, it is useful for understanding the certificate boundary when assessing the blast radius of a hypothetical key compromise.',
          securityImpact: 'No immediate risk. In the event of a private key compromise, an attacker could impersonate any subdomain under the wildcard pattern without needing per-service certificates.',
          potentialAbuse: 'If the private key were obtained by an attacker, it could be used to impersonate any subdomain covered by the wildcard, facilitating phishing or man-in-the-middle attacks against users of those subdomains.',
          remediation: 'No action required unless a key compromise is suspected. For higher-security environments, consider using per-service certificates for sensitive subdomains (e.g., api., auth., admin.) to limit blast radius.',
          safeValidation: 'If this is expected, no further action is needed. Verify that private key material is stored securely and is not exposed in version control, CI/CD pipelines, or configuration files.',
          references: [
            'https://www.rfc-editor.org/rfc/rfc5280',
            'https://letsencrypt.org/docs/faq/#does-let-s-encrypt-issue-wildcard-certificates',
          ],
        },
      }));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 7: SPF not observed (with MX context)
  // ════════════════════════════════════════════════════════════════════════════

  if (dns && !dns.spf?.present) {
    const severity = hasMx ? 'medium' : 'low';
    findings.push(finding({
      title: 'No SPF (Sender Policy Framework) record observed',
      severity,
      kind: 'configuration_weakness',
      category: 'dns',
      description: hasMx
        ? `No SPF TXT record was observed for ${domain}. MX records indicate this domain sends email, making the absence of SPF particularly significant — any mail server can send email claiming to originate from @${domain}.`
        : `No SPF TXT record was observed for ${domain}. Without SPF, email receivers cannot verify whether messages claiming to come from @${domain} are authorised.`,
      recommendation: 'Publish an SPF TXT record in DNS. Identify all legitimate sending sources (your mail server, third-party senders) and list them with a -all qualifier (e.g., `v=spf1 include:_spf.google.com -all`).',
      confidence: 'high',
      observationStatus: 'not_observed',
      evidence: [
        ev('DNS TXT records', `No TXT record beginning with "v=spf1" was observed for ${domain}.`),
        ...(hasMx ? [ev('DNS MX records', `MX records observed, indicating ${domain} is configured for email delivery.`)] : []),
      ],
      analysis: {
        whatIsThis: 'SPF (Sender Policy Framework) is a DNS TXT record that specifies which mail servers are authorised to send email on behalf of a domain. Receiving mail servers check SPF to validate that incoming messages claiming to be from a domain actually come from an authorised source.',
        whatWasObserved: `No SPF TXT record was found in the DNS records for ${domain}.`,
        howDiscovered: `DASS performed a passive DNS lookup querying TXT records for ${domain} and searched for a record beginning with "v=spf1".`,
        technicalExplanation: 'Without an SPF record, any mail server anywhere on the internet can send email with a From: address of @${domain}. Many receiving mail servers will accept such messages because there is no policy stating they should not. Some may also apply heuristic spam scoring.',
        whyItMatters: 'Email spoofing using your domain\'s name can damage your organisation\'s reputation, facilitate phishing attacks against your customers and partners, and bypass spam filters that check SPF.',
        securityImpact: hasMx
          ? `Since ${domain} has MX records (indicating active email use), the absence of SPF is particularly concerning. Attackers can trivially craft emails appearing to come from @${domain} that may pass many spam filters.`
          : `No MX records were observed, suggesting ${domain} may not actively send email. However, without SPF, the domain could still be used in spoofed email campaigns.`,
        potentialAbuse: 'An attacker can configure any mail server to send phishing emails with @' + domain + ' as the sender address. Without SPF, many email providers will deliver these messages or give them benefit of the doubt.',
        remediation: `Add a TXT record at ${domain} with value: \`v=spf1 include:<your-mail-provider> -all\`. Replace <your-mail-provider> with the SPF include provided by your email service (e.g., \`_spf.google.com\` for Google Workspace, \`_spf.mailgun.org\` for Mailgun).`,
        safeValidation: `After publishing, verify: dig TXT ${domain} | grep spf. Then use https://mxtoolbox.com/spf.aspx to validate the record.`,
        references: [
          'https://www.rfc-editor.org/rfc/rfc7208',
          'https://support.google.com/a/answer/33786',
          'https://mxtoolbox.com/SPFRecordGenerator.aspx',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 8: SPF uses +all (allow-all) — dangerous
  // ════════════════════════════════════════════════════════════════════════════

  if (spf.present && spf.allQualifier === 'allow_all') {
    findings.push(finding({
      title: 'SPF record uses +all: any mail server is authorised to send as this domain',
      severity: 'high',
      kind: 'configuration_weakness',
      category: 'dns',
      description: `The SPF record for ${domain} ends with "+all" (or bare "all"), which explicitly authorises every host on the internet to send email claiming to originate from @${domain}. This negates the protective purpose of SPF entirely.`,
      recommendation: 'Change "+all" to "-all" (hardfail) in the SPF record, after listing all legitimate sending mail servers. This instructs receivers to reject mail from unlisted senders.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('DNS TXT SPF record', `SPF record observed: ${spfRecord ?? '(v=spf1 ... +all)'}. The "+all" mechanism authorises all senders.`),
      ],
      analysis: {
        whatIsThis: 'In SPF records, the "all" mechanism defines what happens to senders not explicitly listed. The prefix determines the action: "-all" rejects them, "~all" marks them as suspect, "?all" takes no action, and "+all" explicitly authorises them.',
        whatWasObserved: `The SPF record for ${domain} contains "+all" (or bare "all"), which explicitly permits any mail server to send email from this domain.`,
        howDiscovered: `DASS performed a DNS TXT lookup for ${domain}, found an SPF record, and parsed the "all" mechanism qualifier.`,
        technicalExplanation: 'An SPF record with "+all" is semantically equivalent to having no SPF record at all — any server is explicitly authorized to send mail as this domain. Receiving mail servers that perform SPF checks will see an SPF "pass" for email from any origin, defeating the protection.',
        whyItMatters: 'The SPF record exists but provides no protection. Attackers get the same spoofing capability as if there were no SPF record, but the presence of an SPF record may provide false assurance to administrators.',
        securityImpact: 'Any attacker can send email claiming to be from @' + domain + ' and receive an SPF "pass" from receiving servers. This facilitates phishing and social engineering campaigns that appear legitimate to email infrastructure.',
        potentialAbuse: 'An attacker sends phishing emails from their own mail server claiming to be from @' + domain + '. Because SPF returns "pass" for all senders, the email bypasses SPF-based spam filters and may reach inboxes.',
        remediation: `Update the SPF record to explicitly list only authorised sending sources and end with "-all". Example: \`v=spf1 include:_spf.google.com -all\`. Remove "+all" immediately.`,
        safeValidation: `After updating, verify: dig TXT ${domain} | grep spf. Confirm the record ends with "-all" or "~all". Then test outbound mail delivery from authorised senders.`,
        references: [
          'https://www.rfc-editor.org/rfc/rfc7208#section-5.1',
          'https://dmarcian.com/what-is-spf/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 9: SPF uses ~all (softfail) — informational
  // ════════════════════════════════════════════════════════════════════════════

  if (spf.present && spf.allQualifier === 'softfail') {
    findings.push(finding({
      title: 'SPF record uses ~all (softfail): unauthorised senders are not rejected',
      severity: 'low',
      kind: 'recommendation',
      category: 'dns',
      description: `The SPF record for ${domain} uses "~all" (softfail), meaning mail from unlisted senders is accepted with a warning rather than rejected. This is appropriate while testing but reduces email authentication strength in production.`,
      recommendation: 'Once all legitimate sending sources are confirmed in the SPF record, change "~all" to "-all" (hardfail) to reject mail from unlisted senders outright.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('DNS TXT SPF record', `SPF record observed: ${spfRecord ?? '(v=spf1 ... ~all)'}. The "~all" softfail qualifier is in use.`),
      ],
      analysis: {
        whatIsThis: 'In SPF, "~all" (softfail) instructs receiving mail servers to accept email from unlisted senders but mark it as potentially suspicious. It does not cause rejection. It is typically used during SPF deployment while identifying all sending sources.',
        whatWasObserved: `The SPF record for ${domain} ends with "~all", meaning messages from senders not listed in the SPF record are accepted (not rejected) by default.`,
        howDiscovered: `DASS performed a DNS TXT lookup for ${domain}, found an SPF record, and parsed the "all" mechanism qualifier.`,
        technicalExplanation: 'With "~all", receiving servers return an SPF "softfail" result for unlisted senders. Many spam filters treat this as a mild negative signal, but they still deliver the message. A "-all" hardfail causes SPF-aware servers to reject the message outright.',
        whyItMatters: 'Softfail is a weaker protection than hardfail. An attacker can still send email from an unlisted server and have it delivered to many inboxes, as not all receivers act on SPF softfail. It is appropriate during testing but not as a permanent configuration.',
        securityImpact: 'Lower than if "+all" were used, but unauthorised senders can still successfully deliver messages in many cases, particularly with email providers that do not enforce SPF softfail strictly.',
        potentialAbuse: 'An attacker sending phishing email from an unlisted server gets an SPF "softfail" result. Many email systems deliver softfail messages, so the email may still reach inboxes.',
        remediation: `Once you have confirmed all legitimate email senders are listed in the SPF record, change "~all" to "-all". Test first by validating all expected mail is listed: \`dig TXT ${domain} | grep spf\`.`,
        safeValidation: 'After changing to "-all", verify with MX Toolbox (https://mxtoolbox.com/spf.aspx) and send test emails from all expected sources to confirm delivery.',
        references: [
          'https://www.rfc-editor.org/rfc/rfc7208#section-5',
          'https://dmarcian.com/spf-survey/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 10: SPF too many DNS lookups
  // ════════════════════════════════════════════════════════════════════════════

  if (spf.present && spf.dnsLookupCount > 10) {
    findings.push(finding({
      title: `SPF record exceeds the 10 DNS lookup limit (${spf.dnsLookupCount} lookups observed)`,
      severity: 'medium',
      kind: 'configuration_weakness',
      category: 'dns',
      description: `The SPF record for ${domain} requires approximately ${spf.dnsLookupCount} DNS lookups to evaluate. RFC 7208 limits SPF evaluation to 10 DNS lookups. Receivers that enforce this limit will return a "permerror" result, which may cause legitimate email to be rejected.`,
      recommendation: 'Flatten the SPF record by resolving "include:" chains to their underlying IP ranges, or use an SPF flattening service. Remove unused include: references.',
      confidence: 'medium',
      observationStatus: 'observed',
      evidence: [
        ev('DNS TXT SPF record', `SPF record: ${spfRecord ?? '(complex record)'}. Estimated ${spf.dnsLookupCount} DNS-lookup mechanisms observed.`),
      ],
      analysis: {
        whatIsThis: 'RFC 7208 mandates that SPF evaluation must not require more than 10 DNS lookups (includes, a, mx, ptr, exists, redirect). This limit exists to prevent SPF evaluation from being weaponised as a DNS amplification attack.',
        whatWasObserved: `The SPF record for ${domain} appears to require approximately ${spf.dnsLookupCount} DNS lookups across its include: chains and mechanism references, exceeding the RFC 7208 limit of 10.`,
        howDiscovered: `DASS performed a DNS TXT lookup for ${domain} and counted the number of lookup-requiring mechanisms in the SPF record.`,
        technicalExplanation: 'When an SPF record exceeds 10 DNS lookups, receiving mail servers are required by RFC 7208 to return a "permerror" result and treat the message as if SPF failed. This causes some receiving servers to reject or mark legitimate email from authorised senders.',
        whyItMatters: 'An over-complex SPF record can cause legitimate email from your own authorised senders to fail SPF evaluation — a self-inflicted deliverability problem that can be difficult to diagnose.',
        securityImpact: 'Legitimate email from authorised senders may be rejected or marked as spam by receivers that enforce the 10-lookup limit. This is a deliverability issue, not primarily a security vulnerability.',
        potentialAbuse: 'While not directly exploitable, the permerror state means SPF effectively provides no protection for some receivers, since they cannot complete evaluation.',
        remediation: `Reduce DNS lookups by: (1) Removing unused include: references. (2) Replacing include: with ip4:/ip6: ranges directly. (3) Using an SPF flattening service such as AutoSPF or dmarcian's SPF Flattener.`,
        safeValidation: `After updating, verify the lookup count at: https://mxtoolbox.com/spf.aspx using domain ${domain}. Ensure no "PermError" is reported.`,
        references: [
          'https://www.rfc-editor.org/rfc/rfc7208#section-4.6.4',
          'https://dmarcian.com/spf-survey/',
          'https://mxtoolbox.com/spf.aspx',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 11: DMARC not observed (with MX context)
  // ════════════════════════════════════════════════════════════════════════════

  if (dns && !dns.dmarc?.present) {
    const severity = hasMx ? 'medium' : 'low';
    findings.push(finding({
      title: 'No DMARC record observed',
      severity,
      kind: 'configuration_weakness',
      category: 'dns',
      description: hasMx
        ? `No DMARC TXT record was observed at _dmarc.${domain}. With MX records present, ${domain} sends email — DMARC is a critical control that prevents spoofed email from bypassing SPF/DKIM checks and provides visibility into authentication failures.`
        : `No DMARC TXT record was observed at _dmarc.${domain}. DMARC provides alignment checks on SPF and DKIM authentication and defines a policy for handling unauthenticated messages.`,
      recommendation: `Publish a DMARC TXT record at _dmarc.${domain}. Start with "p=none" and a reporting address (rua=) to gather data, then progress to "p=quarantine" and "p=reject" as you confirm legitimate email is authenticated.`,
      confidence: 'high',
      observationStatus: 'not_observed',
      evidence: [
        ev('DNS TXT lookup', `No TXT record beginning with "v=DMARC1" was observed at _dmarc.${domain}.`),
        ...(hasMx ? [ev('DNS MX records', `MX records observed, indicating ${domain} is configured for email delivery.`)] : []),
      ],
      analysis: {
        whatIsThis: 'DMARC (Domain-based Message Authentication, Reporting & Conformance) is a DNS policy record that tells receiving mail servers what to do with email that fails SPF or DKIM authentication checks. It also enables aggregate reporting of authentication failures, providing visibility into abuse.',
        whatWasObserved: `No DMARC TXT record was found at _dmarc.${domain}.`,
        howDiscovered: `DASS performed a DNS TXT lookup for _dmarc.${domain} and found no record matching the DMARC format (v=DMARC1;...).`,
        technicalExplanation: 'Without DMARC, even if SPF and DKIM are correctly configured, there is no policy enforcement layer that ties them together. DMARC adds "alignment" checks — the From: address domain must match the authenticated domain — and a policy action (none/quarantine/reject) for failures.',
        whyItMatters: 'DMARC prevents the most common form of email spoofing — using a legitimate-looking From: address that passes casual inspection but fails authentication. It also provides a feedback loop via aggregate reports.',
        securityImpact: hasMx
          ? `Without DMARC, even with SPF in place, email spoofing using an aligned From: header is possible. Attackers can craft messages that appear to come from @${domain} that bypass SPF checks by sending from different infrastructure.`
          : 'Without DMARC, there is no policy enforcement for email authentication. This is a foundational gap in email security.',
        potentialAbuse: 'An attacker can send phishing emails with a From: address of @' + domain + ' using infrastructure that passes SPF on a different domain, exploiting the lack of DMARC alignment enforcement to deliver spoofed messages.',
        remediation: `Create a TXT record at _dmarc.${domain} with value: \`v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}\`. After analysing reports for 2-4 weeks, upgrade to p=quarantine, then p=reject.`,
        safeValidation: `After publishing, verify: dig TXT _dmarc.${domain}. Use https://mxtoolbox.com/dmarc.aspx to validate the record format.`,
        references: [
          'https://www.rfc-editor.org/rfc/rfc7489',
          'https://dmarc.org/overview/',
          'https://support.google.com/a/answer/2466580',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 12: DMARC p=none (monitoring only, no enforcement)
  // ════════════════════════════════════════════════════════════════════════════

  if (dmarc.present && dmarc.policyStrength === 'none') {
    findings.push(finding({
      title: 'DMARC policy is p=none: monitoring mode, no enforcement action',
      severity: 'medium',
      kind: 'configuration_weakness',
      category: 'dns',
      description: `The DMARC record for ${domain} specifies p=none, which means unauthenticated email is delivered normally without any enforcement action. DMARC is in monitoring mode only — it collects reports but does not protect recipients from spoofed messages.`,
      recommendation: 'Review DMARC aggregate reports (rua=) to identify all legitimate sending sources. Once confirmed, upgrade the policy to p=quarantine, then p=reject to enforce authentication.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('DNS DMARC record', `DMARC record observed at _dmarc.${domain}: ${dmarcRecord ?? '(v=DMARC1; p=none; ...)'}. Policy: p=none.`),
      ],
      analysis: {
        whatIsThis: 'DMARC p=none is the monitoring-only mode. The DMARC record exists and collects aggregate reports about authentication failures, but tells receivers to take no action on failing messages — they are delivered normally.',
        whatWasObserved: `The DMARC record at _dmarc.${domain} contains p=none. Unauthenticated email from any source claiming to be @${domain} is delivered normally to recipients.`,
        howDiscovered: `DASS performed a DNS TXT lookup for _dmarc.${domain}, found a DMARC record, and parsed the p= tag value.`,
        technicalExplanation: 'p=none is designed as a transition state — it allows operators to observe authentication failures via rua= reports before enforcing rejection. As a permanent configuration, it provides no protection against email spoofing or phishing.',
        whyItMatters: 'A DMARC record with p=none provides visibility (if rua= is configured) but zero protection. Attackers can still successfully deliver spoofed email from @' + domain + ' to recipients. It creates a false sense of security.',
        securityImpact: `Spoofed email claiming to be from @${domain} is still delivered to recipients as if no DMARC existed. The presence of the record does not protect users from phishing or impersonation.`,
        potentialAbuse: 'An attacker can send phishing emails from any server with a From: of @' + domain + '. Because DMARC is p=none, receiving servers deliver the message. Recipients see a legitimate-looking sender address.',
        remediation: `Analyse DMARC aggregate reports (from rua=${dmarc.ruaAddresses.join(', ') || '<not configured>'}) to identify all sending sources. Once legitimate senders are authenticated (SPF+DKIM), upgrade: first to p=quarantine (pct=10, then 100), then to p=reject.`,
        safeValidation: 'Use https://dmarc.org/resources/deployment-guides/ for the phased upgrade path. Verify the updated record with: dig TXT _dmarc.' + domain,
        references: [
          'https://www.rfc-editor.org/rfc/rfc7489#section-6.3',
          'https://dmarc.org/2016/01/deploying-dmarc-the-right-way/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 13: DMARC p=quarantine (partial enforcement, suggest strengthening)
  // ════════════════════════════════════════════════════════════════════════════

  if (dmarc.present && dmarc.policyStrength === 'quarantine') {
    findings.push(finding({
      title: 'DMARC policy is p=quarantine: consider upgrading to p=reject',
      severity: 'informational',
      kind: 'recommendation',
      category: 'dns',
      description: `The DMARC record for ${domain} specifies p=quarantine, which routes unauthenticated email to spam/junk folders. This is a significant improvement over p=none, but full protection requires p=reject.`,
      recommendation: 'After confirming all legitimate email is passing authentication (SPF+DKIM+DMARC alignment), upgrade the policy from p=quarantine to p=reject to prevent spoofed messages from being delivered at all.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('DNS DMARC record', `DMARC record observed: ${dmarcRecord ?? '(v=DMARC1; p=quarantine; ...)'}. Policy: p=quarantine.`),
      ],
      analysis: {
        whatIsThis: 'DMARC p=quarantine instructs receiving servers to route unauthenticated email to the spam or junk folder rather than delivering it to the inbox. It is stronger than p=none but weaker than p=reject.',
        whatWasObserved: `The DMARC record at _dmarc.${domain} specifies p=quarantine. Unauthenticated email is directed to spam/junk rather than rejected outright.`,
        howDiscovered: `DASS performed a DNS TXT lookup for _dmarc.${domain} and parsed the p= tag value.`,
        technicalExplanation: 'With p=quarantine, spoofed email is still delivered — just to a folder users may not monitor closely. A determined phisher may still succeed if recipients check junk mail. p=reject completely refuses delivery at the SMTP level, returning a bounce.',
        whyItMatters: 'p=quarantine significantly reduces phishing success rates compared to p=none. However, spoofed messages are still technically delivered and visible in some mail clients\' spam folders.',
        securityImpact: 'Spoofed email is routed to spam/junk rather than the inbox. Users who monitor spam may still see and act on phishing messages. p=reject removes this residual risk.',
        potentialAbuse: 'An attacker sending spoofed email gets messages quarantined rather than bounced. Some recipients check spam/junk regularly. Highly convincing phishing may still succeed even from the spam folder.',
        remediation: 'Upgrade to p=reject once you have monitored DMARC aggregate reports for 2-4 weeks and confirmed all legitimate email is properly authenticated. Use a phased approach: raise pct= from current to 100 first.',
        safeValidation: 'Check DMARC aggregate reports for any authentication failures before upgrading. Verify with: dig TXT _dmarc.' + domain + ' after the update.',
        references: [
          'https://www.rfc-editor.org/rfc/rfc7489#section-6.3',
          'https://dmarc.org/2016/01/deploying-dmarc-the-right-way/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 14: DMARC pct < 100
  // ════════════════════════════════════════════════════════════════════════════

  if (dmarc.present && dmarc.policyStrength !== 'none' && dmarc.percentage < 100) {
    findings.push(finding({
      title: `DMARC enforcement is partial: pct=${dmarc.percentage}% of failing messages are subject to policy`,
      severity: 'low',
      kind: 'recommendation',
      category: 'dns',
      description: `The DMARC record for ${domain} has pct=${dmarc.percentage}, meaning only ${dmarc.percentage}% of messages that fail DMARC authentication are subject to the p=${dmarc.policy} action. The remaining ${100 - dmarc.percentage}% are delivered as if the policy were p=none.`,
      recommendation: 'Once legitimate email is confirmed to be authenticating correctly, raise pct to 100 to apply DMARC policy to all failing messages.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('DNS DMARC record', `DMARC record: ${dmarcRecord ?? `(v=DMARC1; p=${dmarc.policy ?? 'quarantine'}; pct=${dmarc.percentage})`}. pct=${dmarc.percentage}.`),
      ],
      analysis: {
        whatIsThis: 'The DMARC pct= tag specifies the percentage of messages that fail DMARC authentication to which the policy (quarantine or reject) is applied. It is designed for phased rollouts.',
        whatWasObserved: `The DMARC record for ${domain} has pct=${dmarc.percentage}, meaning the p=${dmarc.policy} policy applies to only ${dmarc.percentage}% of DMARC-failing messages.`,
        howDiscovered: `DASS performed a DNS TXT lookup for _dmarc.${domain} and parsed the pct= tag.`,
        technicalExplanation: 'Receivers implementing pct= apply a random sampling approach: only the specified percentage of failing messages are subjected to the policy action. The remainder are treated as p=none. This means enforcement is incomplete.',
        whyItMatters: 'While pct< 100 is appropriate during phased rollout, a permanently partial enforcement leaves a portion of spoofed email unprotected. The remaining percentage passes through as if no enforcement policy existed.',
        securityImpact: `${100 - dmarc.percentage}% of spoofed messages claiming to be from @${domain} are delivered normally, bypassing the DMARC enforcement policy.`,
        potentialAbuse: 'An attacker sending multiple spoofed messages statistically expects ' + (100 - dmarc.percentage) + '% of them to be delivered to inboxes based on the pct= sampling.',
        remediation: `After confirming all legitimate email is correctly authenticated, update the DMARC record to pct=100: \`v=DMARC1; p=${dmarc.policy ?? 'quarantine'}; pct=100; rua=...\``,
        safeValidation: 'Verify DMARC reports show no unexpected authentication failures before raising pct to 100. Check the updated record with: dig TXT _dmarc.' + domain,
        references: [
          'https://www.rfc-editor.org/rfc/rfc7489#section-6.3',
          'https://dmarc.org/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 15: DMARC no rua= reporting address
  // ════════════════════════════════════════════════════════════════════════════

  if (dmarc.present && dmarc.ruaAddresses.length === 0) {
    findings.push(finding({
      title: 'DMARC record has no aggregate reporting address (rua=)',
      severity: 'low',
      kind: 'recommendation',
      category: 'dns',
      description: `The DMARC record for ${domain} does not include a rua= (reporting URI for aggregate reports) address. Without aggregate reports, it is impossible to monitor authentication failures or detect email spoofing activity.`,
      recommendation: `Add a rua= address to the DMARC record: \`v=DMARC1; p=${dmarc.policy ?? 'none'}; rua=mailto:dmarc-reports@${domain}\`. Consider a DMARC reporting service for easier analysis.`,
      confidence: 'high',
      observationStatus: 'not_observed',
      evidence: [
        ev('DNS DMARC record', `DMARC record observed at _dmarc.${domain}: ${dmarcRecord ?? '(v=DMARC1; p=none)'}. No rua= tag found.`),
      ],
      analysis: {
        whatIsThis: 'DMARC aggregate reports (rua=) are XML files sent daily by receiving mail servers to the address specified in the rua= tag. They report SPF, DKIM, and DMARC authentication outcomes for all email claiming to be from your domain.',
        whatWasObserved: `The DMARC record at _dmarc.${domain} does not include a rua= tag for aggregate report delivery.`,
        howDiscovered: `DASS performed a DNS TXT lookup for _dmarc.${domain} and parsed the DMARC tags, finding no rua= entry.`,
        technicalExplanation: 'Without rua= reports, there is no feedback mechanism to identify which servers are sending email as your domain, which of those fail authentication, and whether spoofing is occurring. This is especially critical for p=none policies, which rely entirely on reports for value.',
        whyItMatters: 'Without reports, administrators have no visibility into email authentication failures or potential spoofing activity. The monitoring benefit of DMARC is entirely lost.',
        securityImpact: 'Ongoing email spoofing or authentication issues go undetected. Problems with legitimate email authentication (which would cause delivery failures after upgrading to p=quarantine/reject) cannot be identified proactively.',
        potentialAbuse: 'Without rua= reporting, an attacker spoofing your domain leaves no trace in your DMARC monitoring — you have no way to detect the campaign.',
        remediation: `Add rua=mailto: to the DMARC record. Use a dedicated email address or a DMARC reporting service (e.g., dmarcian.com, Postmark DMARC, Google Postmaster Tools). Example: \`v=DMARC1; p=${dmarc.policy ?? 'none'}; rua=mailto:dmarc@${domain}\``,
        safeValidation: 'After adding rua=, verify the record is published and wait 24-48 hours for aggregate reports to arrive. Use a DMARC report analyser to review the data.',
        references: [
          'https://www.rfc-editor.org/rfc/rfc7489#section-7',
          'https://dmarc.org/resources/',
          'https://dmarcian.com/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 16: Server header discloses technology version
  // ════════════════════════════════════════════════════════════════════════════

  const serverHeader = http?.https?.headers?.server ?? http?.https?.server;
  const serverHeaderLower = serverHeader?.toLowerCase() ?? '';
  // Detect version disclosure: e.g., "Apache/2.4.51" or "nginx/1.18.0"
  if (serverHeader && /[\/\s]\d+\.\d+/.test(serverHeader) && !serverHeaderLower.includes('cloudflare')) {
    findings.push(finding({
      title: `Server header discloses software version: "${serverHeader}"`,
      severity: 'informational',
      kind: 'observation',
      category: 'http',
      description: `The HTTP Server response header reveals the web server software name and version number: "${serverHeader}". This information assists attackers in identifying known vulnerabilities for the specific version.`,
      recommendation: 'Configure your web server to suppress or genericise the Server header. In Nginx: `server_tokens off;`. In Apache: `ServerTokens Prod; ServerSignature Off;`.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('HTTPS response headers', `Server header observed: "${serverHeader}".`),
      ],
      analysis: {
        whatIsThis: 'The HTTP Server response header identifies the web server software (e.g., Apache, Nginx) and often includes the version number. While not a vulnerability in itself, version disclosure reduces the effort required for targeted reconnaissance.',
        whatWasObserved: `The Server response header contains: "${serverHeader}", disclosing the server software name and version to any HTTP client.`,
        howDiscovered: `DASS performed a passive HTTPS request to ${domain} and inspected the Server header in the response.`,
        technicalExplanation: 'An attacker who knows the exact server version can look up known CVEs for that version in databases like NVD or ExploitDB. While this does not create a vulnerability, it reduces the reconnaissance effort required and can help prioritise attacks against unpatched software.',
        whyItMatters: 'This is a defence-in-depth consideration. Suppressing version information does not prevent exploitation of vulnerabilities but removes easy enumeration of the attack surface. It follows the principle of least disclosure.',
        securityImpact: 'Low. An attacker can enumerate vulnerabilities for the specific server version without needing to probe further. If the server is running an outdated or unpatched version, this disclosure accelerates targeted attack planning.',
        potentialAbuse: 'An attacker notes the server version and queries CVE databases for known vulnerabilities specific to that version, using the information to prioritise which attack techniques to attempt.',
        remediation: 'Suppress or genericise the Server header. In Nginx: add `server_tokens off;` to the http{} or server{} block. In Apache: set `ServerTokens Prod` and `ServerSignature Off` in httpd.conf. For CDN-fronted sites, the CDN usually handles this.',
        safeValidation: `After configuring, verify with: curl -I https://${domain} | grep -i server. The header should either be absent or return a generic value without version numbers.`,
        references: [
          'https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server',
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 17: X-Powered-By header discloses technology
  // ════════════════════════════════════════════════════════════════════════════

  const poweredBy = http?.https?.headers?.['x-powered-by'] ?? http?.https?.poweredBy;
  if (poweredBy && typeof poweredBy === 'string' && poweredBy.length > 0) {
    findings.push(finding({
      title: `X-Powered-By header discloses application framework: "${poweredBy}"`,
      severity: 'informational',
      kind: 'observation',
      category: 'http',
      description: `The X-Powered-By response header reveals the application framework or runtime: "${poweredBy}". This information can help attackers narrow down potential vulnerabilities specific to this technology stack.`,
      recommendation: 'Remove or suppress the X-Powered-By header. In Express.js: `app.disable("x-powered-by")`. In PHP: set `expose_php = Off` in php.ini.',
      confidence: 'high',
      observationStatus: 'observed',
      evidence: [
        ev('HTTPS response headers', `X-Powered-By header observed: "${poweredBy}".`),
      ],
      analysis: {
        whatIsThis: 'The X-Powered-By HTTP response header is added automatically by many web frameworks (Express.js, PHP, ASP.NET) to identify themselves. It is not a standard header and serves no functional purpose for clients.',
        whatWasObserved: `The X-Powered-By header with value "${poweredBy}" was present in the HTTPS response from ${domain}.`,
        howDiscovered: `DASS performed a passive HTTPS request to ${domain} and inspected all response headers.`,
        technicalExplanation: 'Technology disclosure helps attackers build a profile of the application stack without active probing. Knowing the framework and its version enables targeted searches for known vulnerabilities, CVEs, and framework-specific attack patterns.',
        whyItMatters: 'This follows the principle of least disclosure. Removing the header does not fix underlying vulnerabilities but removes free reconnaissance information.',
        securityImpact: 'Low. The header helps an attacker build a more precise picture of the technology stack, potentially accelerating identification of applicable vulnerabilities or misconfigurations.',
        potentialAbuse: 'An attacker enumerates the technology stack passively to determine which CVEs, exploits, or framework-specific attacks to research and attempt.',
        remediation: `Remove the X-Powered-By header at the framework level. Express.js: \`app.disable('x-powered-by')\` or use the helmet.js middleware. PHP: set \`expose_php = Off\` in php.ini. ASP.NET: remove the header in web.config.`,
        safeValidation: `Verify: curl -I https://${domain} | grep -i powered. The header should be absent from responses.`,
        references: [
          'https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/01-Information_Gathering/08-Fingerprint_Web_Application_Framework',
          'https://helmetjs.github.io/',
        ],
      },
    }));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 18: WHOIS domain expiry within 90 days
  // ════════════════════════════════════════════════════════════════════════════

  if (whois?.expiryDate) {
    const expiryMs = Date.parse(whois.expiryDate);
    if (!isNaN(expiryMs)) {
      const daysUntilExpiry = Math.floor((expiryMs - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
        findings.push(finding({
          title: `Domain registration expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} (${whois.expiryDate})`,
          severity: daysUntilExpiry <= 14 ? 'medium' : 'low',
          kind: 'potential_risk',
          category: 'whois',
          description: `WHOIS data indicates the domain registration for ${domain} expires on ${whois.expiryDate} — in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. An expired domain becomes available for registration by anyone, which could enable domain hijacking.`,
          recommendation: 'Renew the domain registration immediately. Enable auto-renewal with your registrar. Set up expiry alerts well in advance (90, 30, and 7 days before expiry).',
          confidence: 'medium',
          observationStatus: 'observed',
          evidence: [
            ev('WHOIS record', `Registrar expiry date observed: ${whois.expiryDate}. Registrar: ${whois.registrar ?? 'unknown'}.`),
          ],
          analysis: {
            whatIsThis: 'Domain registrations have an expiry date. If not renewed before this date, the domain enters a grace period and then becomes available for general registration. Anyone can then register the expired domain.',
            whatWasObserved: `WHOIS data for ${domain} indicates the registration expires on ${whois.expiryDate}, which is ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} from now.`,
            howDiscovered: `DASS performed a passive WHOIS lookup for ${domain} through the authoritative WHOIS servers and extracted the Registry Expiry Date field.`,
            technicalExplanation: 'Domain expiry leads to a sequential process: expiry → grace period (0-30 days, renewals still possible) → redemption period (up to 75 days, expensive renewal) → deletion and open registration. Once deleted, any actor can register the domain.',
            whyItMatters: 'Domain expiry can cause an immediate availability outage for all services under the domain. More critically, an adversary registering an expired domain inherits all DNS reputation, email records, and any hardcoded references to the domain in third-party systems.',
            securityImpact: `If ${domain} expires and is registered by an adversary, they gain control of all email, web traffic, and services associated with the domain. They could harvest credentials, impersonate services, or intercept password reset emails sent to @${domain} addresses.`,
            potentialAbuse: 'An attacker registers the expired domain and sets up email to receive password resets, account recovery emails, or MX-based authentication. They may also redirect web traffic to credential-harvesting pages.',
            remediation: 'Log in to your domain registrar immediately and renew the registration. Enable auto-renewal to prevent this from recurring. Consider registering the domain for multiple years.',
            safeValidation: `After renewal, verify the new expiry date: dig SOA ${domain} or check WHOIS at your registrar. Confirm auto-renewal is enabled in registrar account settings.`,
            references: [
              'https://www.icann.org/resources/pages/expired-registration-recovery-2013-05-03-en',
              'https://www.icann.org/en/accredited-registrars',
            ],
          },
        }));
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 19: Sensitive subdomain names observed
  // ════════════════════════════════════════════════════════════════════════════

  const SENSITIVE_PATTERNS = [
    { pattern: /^(dev|develop|development)\./i, label: 'development' },
    { pattern: /^(staging|stage|uat|qa|test)\./i, label: 'staging/testing' },
    { pattern: /^(admin|administrator|manage|management|console|cp|cpanel|plesk)\./i, label: 'administrative' },
    { pattern: /^(vpn|remote|rdp|bastion|jump)\./i, label: 'remote access' },
    { pattern: /^(internal|intranet|corp|corporate)\./i, label: 'internal' },
    { pattern: /^(backup|bak|old|legacy)\./i, label: 'backup/legacy' },
  ];

  if (subdomains?.subdomains && subdomains.subdomains.length > 0) {
    const sensitiveFound: Array<{ subdomain: string; label: string }> = [];
    for (const sub of subdomains.subdomains) {
      for (const { pattern, label } of SENSITIVE_PATTERNS) {
        if (pattern.test(sub)) {
          sensitiveFound.push({ subdomain: sub, label });
          break;
        }
      }
    }

    if (sensitiveFound.length > 0) {
      const examples = sensitiveFound.slice(0, 5).map((s) => s.subdomain).join(', ');
      findings.push(finding({
        title: `Subdomains with sensitive naming patterns observed (${sensitiveFound.length} found)`,
        severity: 'informational',
        kind: 'observation',
        category: 'subdomains',
        description: `Certificate Transparency logs reveal ${sensitiveFound.length} subdomain${sensitiveFound.length === 1 ? '' : 's'} with naming patterns suggesting ${[...new Set(sensitiveFound.map((s) => s.label))].join(', ')} environments: ${examples}${sensitiveFound.length > 5 ? ', and others.' : '.'}`,
        recommendation: 'Verify these subdomains are intentionally public. Development, staging, and administrative subdomains should use network-level access controls (VPN, IP allowlist) rather than relying on obscurity.',
        confidence: 'high',
        observationStatus: 'observed',
        evidence: [
          ev('Certificate Transparency logs', `Subdomains with sensitive naming patterns observed in CT logs: ${examples}.`),
        ],
        analysis: {
          whatIsThis: 'Certificate Transparency (CT) is a public logging system where every TLS certificate issued is publicly recorded. Subdomains that have received TLS certificates appear in these logs, making them discoverable by anyone — even if the owner considers them non-public.',
          whatWasObserved: `The following subdomains of ${domain} with naming patterns suggesting non-production or administrative environments were observed in public Certificate Transparency logs: ${examples}.`,
          howDiscovered: `DASS queried crt.sh (a public Certificate Transparency log aggregator) for certificates issued for *.${domain} and identified subdomains matching sensitive naming patterns.`,
          technicalExplanation: 'Subdomains exposed through CT logs are publicly discoverable. Development and staging environments often run with reduced security controls (debug modes, verbose errors, weaker authentication, unrestricted admin panels) and may share code/data with production.',
          whyItMatters: 'Non-production environments are frequent targets for attackers because they are often less hardened than production and may contain real customer data used for testing. Their presence in public CT logs means they are discoverable without prior knowledge.',
          securityImpact: 'Development/staging environments may be accessible without authentication or with weak credentials. Administrative panels may expose management interfaces. These environments may contain sensitive data or allow pivoting to production systems.',
          potentialAbuse: 'An attacker enumerates subdomains from CT logs to discover non-production environments, then targets them for easier initial access. Admin panels may have weaker authentication or unpatched vulnerabilities.',
          remediation: 'Restrict access to non-production and administrative subdomains using VPN, IP allowlisting, or certificate-based authentication. Remove TLS certificates for environments that should not be internet-accessible, or use private CA certificates for internal environments.',
          safeValidation: 'Attempt to access each sensitive subdomain from an unauthenticated external connection. Verify that access is denied or requires authentication appropriate to the sensitivity of the environment.',
          references: [
            'https://certificate.transparency.dev/',
            'https://crt.sh/',
            'https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/01-Information_Gathering/04-Enumerate_Applications_on_Webserver',
          ],
        },
      }));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FINDING 20: security.txt not observed
  // ════════════════════════════════════════════════════════════════════════════

  const securityTxtCheck = exposure?.checks?.find((c) => c.path === '/.well-known/security.txt');
  const securityTxtPresent = securityTxtCheck?.present === true;

  if (!securityTxtPresent) {
    findings.push(finding({
      title: 'security.txt not observed',
      severity: 'informational',
      kind: 'recommendation',
      category: 'exposure',
      description: `No security.txt file was observed at https://${domain}/.well-known/security.txt. This file provides security researchers with a standardised way to report vulnerabilities they discover.`,
      recommendation: `Create a security.txt file at https://${domain}/.well-known/security.txt following RFC 9116. Include at minimum a Contact: field with an email or URL for reporting security issues.`,
      confidence: 'high',
      observationStatus: 'not_observed',
      evidence: [
        ev('HTTP probe', `Request to https://${domain}/.well-known/security.txt did not return HTTP 200.`),
      ],
      analysis: {
        whatIsThis: 'security.txt (RFC 9116) is a standardised plain-text file that organisations publish at a well-known URL to tell security researchers how to report vulnerabilities they discover. It is the equivalent of a "responsible disclosure" contact page for automated tools and researchers.',
        whatWasObserved: `No security.txt file was found at https://${domain}/.well-known/security.txt. The endpoint returned a non-200 HTTP status.`,
        howDiscovered: `DASS made a passive HTTP request to https://${domain}/.well-known/security.txt and examined the response status.`,
        technicalExplanation: 'Without security.txt, security researchers who discover vulnerabilities in your systems have no obvious way to report them confidentially. They may report publicly, discard the finding, or in rare cases escalate to full disclosure — all suboptimal outcomes.',
        whyItMatters: 'A security.txt file enables responsible disclosure by providing researchers with a clear, trusted channel for reporting vulnerabilities before they are exploited or made public.',
        securityImpact: 'Low direct impact. However, without a security.txt, vulnerabilities discovered by researchers may go unreported or be publicly disclosed before you have the chance to remediate.',
        potentialAbuse: 'Not directly exploitable. However, the absence signals that the organisation may not have a formal vulnerability disclosure process, which could affect researcher behaviour.',
        remediation: `Create a file at https://${domain}/.well-known/security.txt with at minimum:\n\nContact: mailto:security@${domain}\nExpires: <date one year from now>\n\nGenerate one at: https://securitytxt.org/`,
        safeValidation: `After publishing, verify: curl https://${domain}/.well-known/security.txt. The response should be HTTP 200 with the file content.`,
        references: [
          'https://www.rfc-editor.org/rfc/rfc9116',
          'https://securitytxt.org/',
        ],
      },
    }));
  }

  return findings;
}
