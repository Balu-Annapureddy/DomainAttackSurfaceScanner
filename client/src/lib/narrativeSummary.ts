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

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN-FIRST SECURITY ASSESSMENT GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

export interface HumanAssessmentSummary {
  domain: string;
  formattedDate: string;
  score: number | null;
  scoreBadgeText: string;
  scoreClassification: string;
  scoreExplanationShort: string;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  importantFindingsCount: number;
  protectionsConfirmedCount: number;
  unverifiedAreasCount: number;
  unverifiedCategoryNames: string[];
  whatWeChecked: Array<{ title: string; description: string }>;
  whatWeFoundNarrative: string;
  whatMattersMostNarrative: string;
}

export function generateHumanSecurityAssessment(scan: DomainScan): HumanAssessmentSummary {
  const domain = scan.domain;
  const score = scan.score ?? null;
  const findings = scan.findings ?? [];
  const assets = scan.assets ?? [];

  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;
  const infoCount = findings.filter((f) => f.severity === 'informational').length;
  const importantFindingsCount = highCount + mediumCount;

  const positiveControls = extractPositiveControls(scan);
  const protectionsConfirmedCount = positiveControls.length;

  const failedCategories = Object.entries(scan.categories ?? {})
    .filter(([key, cat]) => key !== 'scoring' && cat.status === 'failed')
    .map(([key]) => key);
  const unverifiedAreasCount = failedCategories.length;

  let scoreClassification = 'Assessment in progress';
  let scoreBadgeText = 'In Progress';
  let scoreExplanationShort = 'Analyzing publicly available security information…';

  if (score !== null && score !== undefined) {
    if (score >= 80) {
      scoreClassification = 'Robust Defense';
      scoreBadgeText = 'Strong — Following core security best practices';
      scoreExplanationShort = 'The domain demonstrates good security habits, with active encryption and key protections in place. Minor improvements are recommended.';
    } else if (score >= 60) {
      scoreClassification = 'Standard Hygiene';
      scoreBadgeText = 'Good, but improvements are recommended';
      scoreExplanationShort = 'Basic security controls are present, but several recommended protections (such as security headers or email policies) are missing.';
    } else if (score >= 40) {
      scoreClassification = 'Moderate Exposure';
      scoreBadgeText = 'Attention Needed — Meaningful configuration gaps observed';
      scoreExplanationShort = 'Notable configuration gaps were identified that leave services vulnerable or easier to impersonate.';
    } else {
      scoreClassification = 'Elevated Risk';
      scoreBadgeText = 'Urgent Review Recommended — Essential defenses missing';
      scoreExplanationShort = 'Multiple foundational security controls are absent, creating potential exposure that should be addressed promptly.';
    }
  }

  const whatWeChecked = [
    {
      title: 'Website Connection & HTTPS',
      description: 'Whether the website enforces encrypted HTTPS and automatically redirects visitors away from insecure plain HTTP.',
    },
    {
      title: 'Security Certificates (TLS)',
      description: 'The validity, issuer, and expiration date of the cryptographic certificate that keeps visitor connections private.',
    },
    {
      title: 'Website Defense Headers',
      description: 'Protective instructions (such as HSTS, CSP, and clickjacking defenses) sent by the web server to shield visitors browsers.',
    },
    {
      title: 'Email Spoofing Protections',
      description: 'Public DNS records (SPF and DMARC) that tell mail providers who is authorized to send email from this domain.',
    },
    {
      title: 'Domain Name System (DNS & DNSSEC)',
      description: 'The public address records that guide internet traffic, and whether cryptographic DNSSEC verification is active.',
    },
    {
      title: 'Public Infrastructure & Certificates',
      description: 'Public certificate logs (Certificate Transparency) and network routing records that reveal associated subdomains and server IPs.',
    },
    {
      title: 'Public Internet Exposure',
      description: 'Public intelligence records (such as Shodan InternetDB) indicating whether sensitive management ports or known software versions appear exposed.',
    },
  ];

  // Dynamic "What We Found" narrative built strictly from actual scan data
  const narrativeSentences: string[] = [];

  // 1. Connection & TLS
  const tlsData = scan.categories.tls?.data as { available?: boolean; validTo?: string; daysUntilExpiration?: number } | undefined;
  const httpData = scan.categories.http?.data as { httpsEnforced?: boolean; missingSecurityHeaders?: string[] } | undefined;

  if (tlsData?.available === true) {
    if (typeof tlsData.daysUntilExpiration === 'number' && tlsData.daysUntilExpiration <= 7) {
      narrativeSentences.push(`We confirmed an active HTTPS service, but the website's security certificate expires in ${tlsData.daysUntilExpiration} day${tlsData.daysUntilExpiration === 1 ? '' : 's'} and requires immediate renewal to prevent browser outage warnings.`);
    } else if (httpData?.httpsEnforced) {
      narrativeSentences.push(`We found that ${domain} has an active HTTPS service with a valid security certificate and correctly redirects unencrypted web traffic to encrypted connections.`);
    } else {
      narrativeSentences.push(`We observed that ${domain} supports encrypted HTTPS, but web requests sent over plain HTTP do not automatically redirect to HTTPS, leaving initial connections unprotected.`);
    }
  } else if (tlsData?.available === false) {
    narrativeSentences.push(`The domain appears to lack an active HTTPS service on port 443, meaning web visitors may be transmitting credentials or reading content without encryption.`);
  } else {
    narrativeSentences.push(`We examined the public web presence of ${domain}.`);
  }

  // 2. Email Protections
  const dnsData = scan.categories.dns?.data as { spf?: { present?: boolean }; dmarc?: { present?: boolean } } | undefined;
  const hasSpf = Boolean(dnsData?.spf?.present);
  const hasDmarc = Boolean(dnsData?.dmarc?.present);

  if (hasSpf && hasDmarc) {
    narrativeSentences.push(`Both SPF and DMARC email authentication records are published in DNS, helping external mail servers verify authentic messages.`);
  } else if (hasSpf && !hasDmarc) {
    narrativeSentences.push(`The domain publishes an SPF record to specify sending servers, but lacks a DMARC policy, making it easier for attackers to spoof emails using this domain name.`);
  } else if (!hasSpf && hasDmarc) {
    narrativeSentences.push(`A DMARC policy is published, but no SPF record was observed in DNS, which may cause legitimate emails to fail authentication checks.`);
  } else if (scan.categories.dns?.status === 'completed') {
    narrativeSentences.push(`Neither SPF nor DMARC email records were found in DNS, meaning email providers cannot automatically verify if emails claiming to be from ${domain} are legitimate.`);
  }

  // 3. Infrastructure & Footprint
  const subdomainsCount = assets.filter((a) => a.type === 'SUBDOMAIN').length;
  const ipCount = assets.filter((a) => a.type === 'IP').length;
  const orgCount = assets.filter((a) => a.type === 'ORGANIZATION').length;

  if (subdomainsCount > 0 || ipCount > 0) {
    const subText = subdomainsCount > 0 ? `${subdomainsCount} subdomain${subdomainsCount > 1 ? 's' : ''} through public certificate records` : '';
    const ipText = ipCount > 0 ? `${ipCount} public server address${ipCount > 1 ? 'es' : ''}` : '';
    const joinText = subText && ipText ? `${subText} and ${ipText}` : subText || ipText;
    const orgText = orgCount > 1 ? ` across ${orgCount} network hosting providers` : '';
    narrativeSentences.push(`Our passive discovery identified ${joinText}${orgText}.`);
  }

  // 4. Exposed ports / CVEs
  const expData = scan.categories.exposure?.data as { shodan?: Array<{ ports?: number[]; vulns?: string[] }> } | undefined;
  let hasRiskyPort = false;
  let hasVuln = false;
  if (expData?.shodan) {
    const riskyPorts = [21, 23, 445, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8086, 9200, 27017];
    for (const host of expData.shodan) {
      if (host.ports?.some((p) => riskyPorts.includes(p))) hasRiskyPort = true;
      if (host.vulns && host.vulns.length > 0) hasVuln = true;
    }
  }

  if (hasRiskyPort || hasVuln) {
    narrativeSentences.push(`Public internet records also indicate exposed administrative/database services or known software versions on associated network endpoints that warrant direct inspection.`);
  }

  const whatWeFoundNarrative = narrativeSentences.join(' ');

  // Dynamic "What Should the User Care About Most?"
  let whatMattersMostNarrative = '';
  if (highCount > 0) {
    const highFindings = findings.filter((f) => f.severity === 'high');
    const topIssue = highFindings[0]?.title || 'A high-priority security item';
    whatMattersMostNarrative = `The most important issue identified during this assessment is: "${topIssue}". This represents a critical configuration gap that exposes traffic or systems to avoidable risk. Addressing this item first will provide the largest immediate improvement to your security posture.`;
  } else if (mediumCount > 0) {
    const medFindings = findings.filter((f) => f.severity === 'medium');
    const topIssue = medFindings[0]?.title || 'A medium-priority configuration weakness';
    whatMattersMostNarrative = `The primary area to focus on is: "${topIssue}". While no critical emergencies were observed, fixing this issue will close an unneeded gap that automated scanners or spammers could exploit.`;
  } else if (lowCount > 0) {
    whatMattersMostNarrative = `Your overall perimeter configuration is in solid condition. The items identified are minor improvements, such as adding extra browser security headers or refining DNS records, to match modern defense best practices.`;
  } else {
    whatMattersMostNarrative = `No security weaknesses were observed from the publicly available data gathered during this scan. All evaluated categories—including encryption, certificate validity, and DNS records—matched expected defensive standards.`;
  }

  return {
    domain,
    formattedDate: formatDate(scan.createdAt),
    score,
    scoreBadgeText,
    scoreClassification,
    scoreExplanationShort,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    importantFindingsCount,
    protectionsConfirmedCount,
    unverifiedAreasCount,
    unverifiedCategoryNames: failedCategories,
    whatWeChecked,
    whatWeFoundNarrative,
    whatMattersMostNarrative,
  };
}

export interface PrioritizedAttentionItem {
  id: string;
  title: string;
  severity: string;
  severityHumanLabel: string;
  severityBadgeColor: string;
  whatWeFound: string;
  whatThisMeans: string;
  whyThisMatters: string;
  whatCouldHappen: string;
  howSeriousIsIt: string;
  whatYouShouldDo: string;
  howWeKnow: string;
  technicalDetails?: string;
  references?: string[];
}

export function getPrioritizedAttentionList(scan: DomainScan): PrioritizedAttentionItem[] {
  const findings = scan.findings ?? [];
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, informational: 3 };

  const sorted = [...findings].sort((a, b) => {
    const orderA = severityOrder[a.severity] ?? 99;
    const orderB = severityOrder[b.severity] ?? 99;
    return orderA - orderB;
  });

  return sorted.map((f) => {
    const a = f.analysis;
    const title = f.title;

    let severityHumanLabel = 'Notice';
    let severityBadgeColor = 'border-slate-400 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300';
    let howSeriousIsIt = 'This is an informational observation about your public configuration.';

    if (f.severity === 'high') {
      severityHumanLabel = 'High Priority — Prompt Attention Needed';
      severityBadgeColor = 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-400';
      howSeriousIsIt = 'High — This is an important security gap. While it does not mean your servers are breached, it leaves a core service unprotected or exposes sensitive communications to eavesdropping or spoofing.';
    } else if (f.severity === 'medium') {
      severityHumanLabel = 'Medium Priority — Remediation Recommended';
      severityBadgeColor = 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400';
      howSeriousIsIt = 'Medium — This represents a notable missing defense. Adding this protection closes a known exposure vector that attackers or automated crawlers actively look for.';
    } else if (f.severity === 'low') {
      severityHumanLabel = 'Low Priority — Good Practice Improvement';
      severityBadgeColor = 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400';
      howSeriousIsIt = 'Low — Improvement recommended. This does not imply an imminent vulnerability; rather, it is an additional layer of defense that modern best practices recommend adopting.';
    } else {
      severityHumanLabel = 'Informational Observation';
      severityBadgeColor = 'border-slate-500 text-slate-700 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-400';
      howSeriousIsIt = 'Informational — This highlights how your services appear from the outside for operational awareness.';
    }

    const whatWeFound = a?.whatWasObserved || f.description || title;
    const whatThisMeans = a?.whatIsThis || summarizeFindingPlain(f);
    const whyThisMatters = a?.whyItMatters || f.whyItMatters || 'Helps ensure external communications and services remain secure.';
    const whatCouldHappen = a?.potentialAbuse || a?.securityImpact || 'Attackers or malicious third parties could take advantage of the missing control to eavesdrop on connections, manipulate browser behavior, or impersonate your domain in communications.';
    const whatYouShouldDo = a?.remediation || f.recommendation || 'Consult your system or DNS administrator to update configuration settings.';
    const howWeKnow = a?.howDiscovered || (f.evidence && f.evidence.length > 0 ? f.evidence.map((e) => e.description).join('; ') : 'Observed during public DNS and network protocol queries.');
    const technicalDetails = a?.technicalExplanation || (f.evidence && f.evidence.length > 0 ? JSON.stringify(f.evidence, null, 2) : undefined);

    return {
      id: f.id,
      title,
      severity: f.severity,
      severityHumanLabel,
      severityBadgeColor,
      whatWeFound,
      whatThisMeans,
      whyThisMatters,
      whatCouldHappen,
      howSeriousIsIt,
      whatYouShouldDo,
      howWeKnow,
      technicalDetails,
      references: a?.references,
    };
  });
}

export interface ConfirmedProtectionItem {
  title: string;
  plainExplanation: string;
  category: string;
}

export function getConfirmedProtectionsDetailed(scan: DomainScan): ConfirmedProtectionItem[] {
  const list: ConfirmedProtectionItem[] = [];

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

  if (tlsData?.available) {
    list.push({
      title: 'HTTPS & TLS Encryption Active',
      plainExplanation: 'The domain provides a secure, encrypted HTTPS connection. This keeps information exchanged between website visitors and your servers confidential and protected from tampering.',
      category: 'Website Security',
    });
  }

  if (httpData?.httpsEnforced) {
    list.push({
      title: 'Automatic HTTPS Redirection Enforced',
      plainExplanation: 'Visitors who type "http://" are automatically upgraded to secure "https://", preventing visitors from accidentally transmitting data over an unencrypted connection.',
      category: 'Website Security',
    });
  }

  if (typeof tlsData?.daysUntilExpiration === 'number' && tlsData.daysUntilExpiration > 30) {
    list.push({
      title: 'Valid Security Certificate in Good Standing',
      plainExplanation: `The current website certificate has ${tlsData.daysUntilExpiration} days remaining before renewal. Visitors will not experience unexpected security warning screens.`,
      category: 'Certificates',
    });
  }

  if (dnsData?.spf?.present) {
    list.push({
      title: 'Email Sender Verification (SPF Record Published)',
      plainExplanation: 'An SPF record was found in DNS. This gives recipient mail servers an authorized list of servers permitted to send email from your domain, reducing spam and spoofing.',
      category: 'Email Protection',
    });
  }

  if (dnsData?.dmarc?.present) {
    list.push({
      title: 'Email Phishing Protection (DMARC Policy Active)',
      plainExplanation: 'A DMARC policy is published in DNS. This instructs receiving email servers how to handle fake or fraudulent emails claiming to come from your organization.',
      category: 'Email Protection',
    });
  }

  if (dnsData?.dnssec?.observed) {
    list.push({
      title: 'Cryptographic DNS Authentication (DNSSEC Active)',
      plainExplanation: 'Domain Name System Security Extensions (DNSSEC) are enabled, cryptographically signing DNS records so attackers cannot easily redirect visitors to fake IP addresses.',
      category: 'Domain & DNS',
    });
  }

  const presentHeaders = httpData?.presentSecurityHeaders || httpData?.https?.presentSecurityHeaders || [];
  if (presentHeaders.length > 0) {
    list.push({
      title: `Browser Defense Headers Observed (${presentHeaders.length} Present)`,
      plainExplanation: `The web server transmits protective headers (${presentHeaders.join(', ')}) that instruct visitors browsers to defend against code injection, clickjacking, or data leaks.`,
      category: 'Headers',
    });
  }

  if (exposureData?.securityTxt?.exists) {
    list.push({
      title: 'Responsible Disclosure Policy (security.txt Published)',
      plainExplanation: 'A public security.txt file was detected, giving ethical security researchers clear instructions on how to notify you about potential vulnerabilities responsibly.',
      category: 'Operational Security',
    });
  }

  return list;
}

export interface HumanScoreCategory {
  title: string;
  technicalLabel: string;
  maxDeduction: number;
  deducted: number;
  scoreImpactText: string;
  statusText: string;
  isClean: boolean;
  whatWasObserved: string;
  whyItAffectedScore: string;
  whatWouldImproveIt: string;
  notes: string[];
}

export function getHumanScoreBreakdown(scan: DomainScan): HumanScoreCategory[] {
  const breakdown = scan.scoreBreakdown;
  if (!breakdown) return [];

  const dims = breakdown.dimensions;
  const categories: HumanScoreCategory[] = [];

  // 1. TLS Hygiene
  if (dims.tlsHygiene) {
    const d = dims.tlsHygiene;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Security Certificate & Encryption (TLS)',
      technicalLabel: 'TLS Hygiene',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Healthy & Valid' : 'Renewal or Setup Needed',
      isClean,
      whatWasObserved: isClean
        ? 'A valid cryptographic certificate was observed with sufficient time remaining before expiration.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Encryption protects data in transit and assures visitors of website identity.'
        : 'An expired or soon-to-expire certificate causes browser error blocks, while an absent certificate leaves traffic unencrypted.',
      whatWouldImproveIt: isClean
        ? 'Continue automating certificate renewals through ACME/Let’s Encrypt or your cloud provider.'
        : 'Renew the certificate promptly and ensure automatic renewal is configured before expiration.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 2. HTTPS Enforcement
  if (dims.httpsEnforcement) {
    const d = dims.httpsEnforcement;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Website Connection Security (HTTPS Redirection)',
      technicalLabel: 'HTTPS Enforcement',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Properly Enforced' : 'Unenforced Redirection',
      isClean,
      whatWasObserved: isClean
        ? 'Plain HTTP requests are automatically redirected to encrypted HTTPS connections.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Ensures all web visitors communicate through an encrypted channel.'
        : 'Allowing plain HTTP connections without redirection leaves visitors vulnerable to eavesdropping on public Wi-Fi networks.',
      whatWouldImproveIt: isClean
        ? 'Maintain strict 301/308 redirects from port 80 to port 443.'
        : 'Configure your web server or CDN to automatically redirect all HTTP traffic to HTTPS.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 3. Web Security Headers
  if (dims.webSecurityHeaders) {
    const d = dims.webSecurityHeaders;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Browser Security Headers',
      technicalLabel: 'Web Security Headers',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Hardened Headers Active' : `${d.observations.length} Recommended Header(s) Missing`,
      isClean,
      whatWasObserved: isClean
        ? 'Key browser security headers (such as HSTS, CSP, and X-Content-Type-Options) are present.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Defensive headers instruct web browsers to block cross-site scripting and unauthorized framing.'
        : 'Missing security headers leave browsers without explicit instructions to enforce transport encryption or block content injection.',
      whatWouldImproveIt: isClean
        ? 'Periodically review Content Security Policy rules as your web application evolves.'
        : 'Add missing headers like Strict-Transport-Security, Content-Security-Policy, and X-Content-Type-Options to your web server responses.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 4. Email Security
  if (dims.emailSecurity) {
    const d = dims.emailSecurity;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Email Spoofing Protection (SPF & DMARC)',
      technicalLabel: 'Email Security',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Email Records Configured' : 'Missing Anti-Spoofing Records',
      isClean,
      whatWasObserved: isClean
        ? 'Both SPF and DMARC records were observed in public DNS.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Helps protect your organization’s domain reputation by blocking unauthorized email senders.'
        : 'Without SPF and DMARC, external mail servers cannot tell if fraudulent phishing emails actually came from you.',
      whatWouldImproveIt: isClean
        ? 'Review DMARC reports regularly and progress toward a strict "p=reject" policy.'
        : 'Publish valid SPF (v=spf1) and DMARC (v=DMARC1) TXT records in your authoritative DNS zone.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 5. DNSSEC Hygiene
  if (dims.dnssecHygiene) {
    const d = dims.dnssecHygiene;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Domain Name System Authentication (DNSSEC)',
      technicalLabel: 'DNSSEC Hygiene',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Cryptographic DNSSEC Active' : 'DNSSEC Not Enabled',
      isClean,
      whatWasObserved: isClean
        ? 'Cryptographic DNSKEY and DS records were verified in authoritative DNS.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Cryptographically guarantees that domain lookup responses have not been intercepted or forged.'
        : 'Without DNSSEC, DNS responses are sent without cryptographic signatures, leaving lookups susceptible to spoofing on hostile networks.',
      whatWouldImproveIt: isClean
        ? 'Maintain DNSSEC key rollover schedules through your registrar.'
        : 'Enable DNSSEC signing through your domain registrar or DNS hosting provider.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 6. Network Exposure
  if (dims.networkExposure) {
    const d = dims.networkExposure;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Public Internet Exposure & Service Ports',
      technicalLabel: 'Network Exposure',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'No High-Risk Ports Exposed' : 'Exposed Service Ports or Known Issues',
      isClean,
      whatWasObserved: isClean
        ? 'No sensitive database or remote administration ports were observed on public IP addresses in passive intelligence records.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Restricting administrative access to private networks prevents automated brute-force attacks.'
        : 'Exposing management ports (like SSH, RDP) or database services to the public internet makes them prime targets for automated attacks.',
      whatWouldImproveIt: isClean
        ? 'Keep administrative ports behind a VPN or zero-trust access gateway.'
        : 'Place database and administrative ports behind a firewall, private network, or VPN rather than exposing them directly.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 7. Certificate Chain Correctness
  if (dims.certificateChain) {
    const d = dims.certificateChain;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Certificate Chain & Hostname Validation',
      technicalLabel: 'Certificate Chain Correctness',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Valid Chain & SANs' : 'Chain or Hostname Gap',
      isClean,
      whatWasObserved: isClean
        ? 'The certificate Subject Alternative Names cover the scanned hostname and a complete intermediate chain was served.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Assures connecting clients of domain identity and prevents untrusted connection warnings.'
        : 'A hostname mismatch or missing intermediate certificate causes browsers and mobile clients to reject HTTPS connections.',
      whatWouldImproveIt: isClean
        ? 'Maintain automated certificate management covering all required subdomains.'
        : 'Reissue certificate with correct SANs and ensure web servers serve the fullchain.pem certificate bundle.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 8. Subdomain Takeover Risk
  if (dims.subdomainTakeover) {
    const d = dims.subdomainTakeover;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Subdomain Takeover & Dangling DNS',
      technicalLabel: 'Subdomain Takeover Risk',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'No Dangling Records' : 'High-Risk Takeover Detected',
      isClean,
      whatWasObserved: isClean
        ? 'No subdomains point to decommissioned or unclaimed third-party cloud resources.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Prevents unauthorized actors from hijacking organizational subdomains.'
        : 'Dangling CNAME records pointing to unclaimed services allow attackers to host arbitrary malicious content on your domain.',
      whatWouldImproveIt: isClean
        ? 'Maintain an automated inventory of DNS records and decommissioned cloud tenants.'
        : 'Immediately delete dangling DNS CNAME records or reclaim the orphaned resource in the provider console.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 9. Domain & WHOIS Hygiene
  if (dims.whoisHygiene) {
    const d = dims.whoisHygiene;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Domain Registration & WHOIS Privacy',
      technicalLabel: 'Domain & WHOIS Hygiene',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Established & Protected' : 'Soft Hygiene Advisory',
      isClean,
      whatWasObserved: isClean
        ? 'Domain has established age with privacy protection enabled on registrant contact records.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Reduces administrative spear-phishing exposure and provides established domain reputation.'
        : 'Unredacted contact details expose administrators to targeted scams, while newly registered domains face baseline scrutiny.',
      whatWouldImproveIt: isClean
        ? 'Keep WHOIS privacy protection active and monitor domain renewal dates.'
        : 'Enable registrar privacy proxy protection to mask administrative contact details from public scrapers.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 10. Cookie Security
  if (dims.cookieSecurity) {
    const d = dims.cookieSecurity;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Session Cookie Protection',
      technicalLabel: 'Cookie Security',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Hardened Cookie Attributes' : 'Insecure Cookie Flags',
      isClean,
      whatWasObserved: isClean
        ? 'Session cookies include Secure, HttpOnly, and SameSite protection flags.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Prevents credential interception across plaintext networks and mitigates script-based token theft.'
        : 'Missing Secure or HttpOnly flags on session tokens leaves user sessions vulnerable to eavesdropping and XSS theft.',
      whatWouldImproveIt: isClean
        ? 'Continue enforcing Secure, HttpOnly, and SameSite=Lax on all sensitive cookies.'
        : 'Add Secure and HttpOnly flags to Set-Cookie response headers for all authentication and session identifiers.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 11. CORS Misconfiguration
  if (dims.corsConfiguration) {
    const d = dims.corsConfiguration;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Cross-Origin Resource Sharing (CORS)',
      technicalLabel: 'CORS Misconfiguration',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'Restricted Origins' : 'Permissive Origin & Credentials',
      isClean,
      whatWasObserved: isClean
        ? 'CORS headers do not expose authenticated responses to arbitrary wildcard origins.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Protects private user session data from being read by unauthorized third-party websites.'
        : 'Combining Access-Control-Allow-Origin: * with credentials allows third-party websites to read authenticated user responses.',
      whatWouldImproveIt: isClean
        ? 'Maintain explicit origin whitelists for authenticated APIs.'
        : 'Remove wildcard (*) origin headers on endpoints requiring credentials; validate and echo only trusted origins.',
      notes: d.observations.map((o) => o.description),
    });
  }

  // 12. Breach Exposure
  if (dims.breachExposure) {
    const d = dims.breachExposure;
    const isClean = d.deducted === 0;
    categories.push({
      title: 'Historical Breach Incident Exposure',
      technicalLabel: 'Breach Exposure',
      maxDeduction: d.maxDeduction,
      deducted: d.deducted,
      scoreImpactText: isClean ? 'No deduction (0 pts)' : `−${d.deducted} points deducted`,
      statusText: isClean ? 'No Public Breaches' : 'Historical Incidents Recorded',
      isClean,
      whatWasObserved: isClean
        ? 'No public breach disclosure records were catalogued for this organization domain in public indexes.'
        : d.observations.map((o) => o.description).join('; '),
      whyItAffectedScore: isClean
        ? 'Indicates no widespread public exposure of historical domain credentials in known data breaches.'
        : 'Historical breach presence signals potential residual risk from credential reuse if multi-factor authentication is not enforced.',
      whatWouldImproveIt: isClean
        ? 'Mandate multi-factor authentication (MFA) across all employee accounts.'
        : 'Enforce phishing-resistant MFA across all corporate logins and require password rotation for accounts with legacy credentials.',
      notes: d.observations.map((o) => o.description),
    });
  }

  return categories;
}

