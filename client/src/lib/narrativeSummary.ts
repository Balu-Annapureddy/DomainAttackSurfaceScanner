import type { DomainScan, Finding } from '../../../shared/types';

export interface DetailedFindingItem {
  id: string;
  title: string;
  severity: string;
  plainSummary: string;
}

export interface DetailedFindingsOverview {
  scanSentence: string;
  scoreSentence: string;
  findingsWalkthrough: DetailedFindingItem[];
  findingsWalkthroughText: string;
  positiveControls: string[];
  positiveControlsText: string;
  fullNarrative: string;
}

function formatDate(iso?: string): string {
  if (!iso) return 'recently';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return 'recently';
  }
}

/**
 * Summarizes an individual finding into 1 or 2 plain-language sentences.
 * Strictly adheres to Phase 4 rules:
 * - One idea per sentence.
 * - Inline plain-language gloss for acronyms/technical terms.
 * - "This means..." framing.
 * - No unevidenced marketing jargon.
 */
export function summarizeFindingPlain(f: Finding): string {
  const title = f.title.toLowerCase();

  if (title.includes('https enforcement')) {
    return 'Web traffic sent over unencrypted HTTP does not automatically redirect to secure HTTPS. This means visitor traffic could potentially be intercepted on shared networks before switching to an encrypted connection.';
  }
  if (title.includes('exclusively over unencrypted http') || title.includes('without any tls')) {
    return 'This website operates only over unencrypted HTTP and has no HTTPS enabled. This means all passwords, session data, and page content travel as readable plaintext across the internet.';
  }
  if (title.includes('hsts') || title.includes('strict-transport-security')) {
    return 'The HSTS (HTTP Strict-Transport-Security, an instruction telling browsers to only connect securely) header is missing. This means web browsers are not instructed to always enforce HTTPS, leaving visitors vulnerable to downgrade attacks on untrusted networks.';
  }
  if (title.includes('content-security-policy') || title.includes('csp')) {
    return 'No Content-Security-Policy (CSP, a defensive header that controls which scripts are allowed to run) was observed. This means the browser will not have an extra layer of defense if an attacker tries to inject malicious scripts into the page.';
  }
  if (title.includes('x-frame-options') || title.includes('clickjacking')) {
    return 'No clickjacking protection (X-Frame-Options header) was observed. This means malicious external sites could embed this page inside an invisible frame to trick visitors into unwanted clicks.';
  }
  if (title.includes('x-content-type-options') || title.includes('mime')) {
    return 'The X-Content-Type-Options header is missing. This means web browsers might guess file types automatically, which can cause non-executable files to be executed as malicious code.';
  }
  if (title.includes('referrer-policy')) {
    return 'No Referrer-Policy header is set. This means visitor navigation paths could leak to external websites when users click outgoing links.';
  }
  if (title.includes('permissions-policy')) {
    return 'No Permissions-Policy header is configured. This means the website has not explicitly restricted browser features like camera, microphone, or geolocation access.';
  }
  if (title.includes('approaching expiration') || title.includes('expires soon')) {
    return 'The TLS (website security certificate) will expire soon. This means visitors will see browser security error screens if the certificate is not renewed before its expiry date.';
  }
  if (title.includes('expired tls certificate') || title.includes('certificate is expired')) {
    return 'The website security certificate is already expired. This means visitors see security warning screens and modern browsers will block access to the site.';
  }
  if (title.includes('wildcard tls certificate') || title.includes('wildcard')) {
    return 'A wildcard TLS certificate is in use across multiple subdomains. This means if any single subdomain server is ever compromised, the private key for all other subdomains is compromised as well.';
  }
  if (title.includes('weak signature algorithm') || title.includes('sha-1')) {
    return 'The security certificate uses an obsolete signature algorithm (such as SHA-1). This means the certificate relies on outdated mathematical hashing that modern browsers consider insecure.';
  }
  if (title.includes('dmarc policy is missing') || title.includes('no dmarc')) {
    return 'No DMARC (email protection policy) record was found in DNS. This means scammers can send fraudulent emails pretending to come from this domain without being blocked by recipient mail servers.';
  }
  if (title.includes('dmarc policy is set to "none"') || title.includes('monitoring-only')) {
    return 'The domain publishes a DMARC email record, but its policy is set to monitoring-only. This means fake emails are reported in background logs rather than blocked from reaching inboxes.';
  }
  if (title.includes('spf record not found') || title.includes('no spf')) {
    return 'No SPF (Sender Policy Framework) record was found in DNS. This means receiving mail servers have no authorized list of valid sending servers for this domain.';
  }
  if (title.includes('spf record allows all senders') || title.includes('+all')) {
    return 'The SPF email record authorizes every computer on the internet to send email for this domain. This means anyone can send email impersonating this domain.';
  }
  if (title.includes('spf lookup limit') || title.includes('10 lookup')) {
    return 'The SPF email record requires too many DNS lookups to validate. This means some email providers will treat legitimate emails as errors and reject them.';
  }
  if (title.includes('database') || title.includes('3306') || title.includes('5432')) {
    return 'A database server port was found listening directly on the public internet. This means attackers can reach the database login service directly, which should be isolated on a private internal network.';
  }
  if (title.includes('remote management') || title.includes('22') || title.includes('3389')) {
    return 'An administrative remote management port is directly exposed to the internet. This means attackers can attempt automated password guessing against server management services.';
  }
  if (title.includes('vulnerability') || title.includes('cve')) {
    return 'Public security records show known software vulnerabilities running on this host. This means attackers could use documented exploitation tools against unpatched software versions.';
  }
  if (title.includes('cloud storage') || title.includes('bucket')) {
    return 'A public cloud storage namespace was found matching this domain name. This means files stored in this cloud bucket could be accessible if permissions are misconfigured.';
  }
  if (title.includes('breach')) {
    return 'This domain was found in public records of historical data breaches. This means past credential leaks could pose a security risk if employees reuse old passwords without multi-factor authentication.';
  }
  if (title.includes('document') && title.includes('metadata')) {
    return 'Public documents linked on this website contain embedded creation metadata. This means internal software names and version details can be discovered by anyone downloading the files.';
  }

  // Fallback for any other finding
  const obs = f.analysis?.whatWasObserved || f.description || f.title;
  const why = f.whyItMatters || f.analysis?.whyItMatters;
  if (why && !why.toLowerCase().startsWith('this means')) {
    return `${obs} This means: ${why}`;
  }
  return `${obs} ${why || ''}`.trim();
}

/**
 * Extracts confirmed positive security controls (what's good).
 */
export function extractPositiveControls(scan: DomainScan): string[] {
  const controls: string[] = [];
  const httpData = scan.categories?.http?.data as {
    httpsEnforced?: boolean;
    presentSecurityHeaders?: string[];
    https?: { presentSecurityHeaders?: string[] };
  } | undefined;

  const tlsData = scan.categories?.tls?.data as {
    available?: boolean;
    daysUntilExpiration?: number;
    protocol?: string;
  } | undefined;

  const dnsData = scan.categories?.dns?.data as {
    spf?: { present?: boolean; policy?: string };
    dmarc?: { present?: boolean; record?: string };
    dnssec?: { observed?: boolean };
  } | undefined;

  const exposureData = scan.categories?.exposure?.data as {
    securityTxt?: { exists?: boolean };
  } | undefined;

  if (httpData?.httpsEnforced) {
    controls.push('HTTPS enforcement is active. Unencrypted web requests are automatically redirected to encrypted HTTPS connections.');
  }

  if (tlsData?.available) {
    const proto = tlsData.protocol ? ` (${tlsData.protocol})` : '';
    controls.push(`TLS (Transport Layer Security) encryption is active${proto}. Web traffic is protected from eavesdropping in transit.`);
  }

  if (typeof tlsData?.daysUntilExpiration === 'number' && tlsData.daysUntilExpiration > 30) {
    controls.push(`The website security certificate is healthy. It has ${tlsData.daysUntilExpiration} days remaining before renewal is needed.`);
  }

  if (dnsData?.spf?.present || dnsData?.spf?.policy) {
    controls.push('An SPF (Sender Policy Framework) record is published in DNS. This lists which mail servers are permitted to send email for this domain.');
  }

  if (dnsData?.dmarc?.present || dnsData?.dmarc?.record) {
    controls.push('A DMARC (email protection policy) record is published in DNS. This helps mail providers verify legitimate emails and block spoofed messages.');
  }

  if (dnsData?.dnssec?.observed) {
    controls.push('DNSSEC (Domain Name System Security Extensions) is enabled. Domain lookup records are cryptographically signed to prevent DNS spoofing.');
  }

  if (exposureData?.securityTxt?.exists) {
    controls.push('A security.txt file is published. This gives security researchers a verified contact method to report vulnerabilities responsibly.');
  }

  const presentHeaders = httpData?.presentSecurityHeaders || httpData?.https?.presentSecurityHeaders || [];
  if (presentHeaders.length > 0) {
    const headerList = presentHeaders.map((h) => h.toLowerCase()).join(', ');
    controls.push(`Defensive HTTP security headers were observed (${headerList}). These headers instruct web browsers to enforce strict security protections.`);
  }

  return controls;
}

/**
 * Generates the full detailed findings overview data structure.
 */
export function generateDetailedFindingsOverview(scan: DomainScan): DetailedFindingsOverview {
  const domain = scan.domain;
  const score = scan.score ?? null;
  const findings = scan.findings ?? [];

  // 1. What was scanned and when, in one sentence.
  const scanSentence = `This scan evaluated the public attack surface of ${domain} on ${formatDate(scan.createdAt)}.`;

  // 2. The score, and one sentence on what that range generally means.
  let scoreSentence = '';
  if (score !== null && score !== undefined) {
    if (score >= 80) {
      scoreSentence = `The domain received an external hygiene score of ${score}/100, which falls in the strong range. This means the domain follows core security best practices, with active encryption and careful perimeter management.`;
    } else if (score >= 60) {
      scoreSentence = `The domain received an external hygiene score of ${score}/100, which falls in the moderate range. This means basic security protections are in place, but several recommended safeguards are still missing.`;
    } else if (score >= 40) {
      scoreSentence = `The domain received an external hygiene score of ${score}/100, which falls in the weak range. This means notable configuration gaps were found that leave services exposed to automated scanning.`;
    } else {
      scoreSentence = `The domain received an external hygiene score of ${score}/100, which falls in the critical attention range. This means multiple essential security protections are absent, requiring immediate review.`;
    }
  } else {
    scoreSentence = 'An external hygiene score has not yet been calculated for this domain.';
  }

  // 3. Short plain-language walkthrough of every finding in reading order.
  const findingsWalkthrough: DetailedFindingItem[] = findings.map((f) => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    plainSummary: summarizeFindingPlain(f),
  }));

  let findingsWalkthroughText = '';
  if (findingsWalkthrough.length === 0) {
    findingsWalkthroughText = 'No security weaknesses or configuration issues were observed during this scan.';
  } else {
    findingsWalkthroughText = `We identified ${findingsWalkthrough.length} security observation${findingsWalkthrough.length > 1 ? 's' : ''}:\n` +
      findingsWalkthrough.map((item) => `• ${item.title}: ${item.plainSummary}`).join('\n');
  }

  // 4. What's good (confirmed positive controls) or if 0, say so plainly.
  const positiveControls = extractPositiveControls(scan);
  let positiveControlsText = '';
  if (positiveControls.length > 0) {
    positiveControlsText = `Confirmed security controls observed on this domain include:\n` +
      positiveControls.map((c) => `✓ ${c}`).join('\n');
  } else {
    positiveControlsText = 'No confirmed defensive security controls (such as HTTPS enforcement, defensive HTTP headers, or email authentication records) were observed during this scan.';
  }

  const fullNarrative = [
    scanSentence,
    scoreSentence,
    findingsWalkthroughText,
    positiveControlsText,
  ].join('\n\n');

  return {
    scanSentence,
    scoreSentence,
    findingsWalkthrough,
    findingsWalkthroughText,
    positiveControls,
    positiveControlsText,
    fullNarrative,
  };
}

/**
 * Top-level narrative summary generator returning the full plain-language prose.
 */
export function generateNarrativeSummary(scan: DomainScan): string {
  const overview = generateDetailedFindingsOverview(scan);
  return overview.fullNarrative;
}
