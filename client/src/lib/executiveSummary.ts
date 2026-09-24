import type { DomainScan, FindingSeverity } from '../../../shared/types';

export interface ExecutiveSummaryData {
  domain: string;
  scanDate: string;
  status: string;
  score: number | null;
  scoreAssessment: string;
  stats: {
    totalAssets: number;
    subdomains: number;
    ipAddresses: number;
    asns: number;
    organizations: number;
    mailServers: number;
    certificates: number;
    approximateLocations: number;
  };
  observations: {
    httpsEnforced: boolean | null;
    tlsActive: boolean;
    tlsProtocol?: string;
    certExpiresDays?: number;
    hasSpf: boolean;
    spfPolicy?: string;
    hasDmarc: boolean;
    dmarcPolicy?: string;
    missingHeadersCount: number;
    presentHeadersCount: number;
    exposedFiles: string[];
  };
  findingsSummary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
    total: number;
  };
  keyTakeaways: string[];
}

export function generateExecutiveSummary(scan: DomainScan): ExecutiveSummaryData {
  const assets = scan.assets || [];
  const findings = scan.findings || [];

  const subdomains = assets.filter((a) => a.type === 'SUBDOMAIN').length;
  const ipAddresses = assets.filter((a) => a.type === 'IP').length;
  const asns = assets.filter((a) => a.type === 'ASN').length;
  const organizations = assets.filter((a) => a.type === 'ORGANIZATION').length;
  const mailServers = assets.filter((a) => a.type === 'MAIL_SERVER').length;
  const certificates = assets.filter((a) => a.type === 'CERTIFICATE').length;
  const approximateLocations = assets.filter((a) => a.type === 'GEOLOCATION').length;

  const httpData = scan.categories.http?.data as {
    httpsEnforced?: boolean;
    missingSecurityHeaders?: string[];
    observedSecurityHeaders?: Record<string, string>;
  } | undefined;

  const tlsData = scan.categories.tls?.data as {
    available?: boolean;
    protocol?: string;
    validTo?: string;
    daysUntilExpiration?: number;
  } | undefined;

  const dnsData = scan.categories.dns?.data as {
    spf?: { record?: string };
    dmarc?: { record?: string };
  } | undefined;

  const exposureData = scan.categories.exposure?.data as {
    robotsTxt?: { exists?: boolean };
    sitemapXml?: { exists?: boolean };
    securityTxt?: { exists?: boolean };
  } | undefined;

  const exposedFiles: string[] = [];
  if (exposureData?.robotsTxt?.exists) exposedFiles.push('robots.txt');
  if (exposureData?.sitemapXml?.exists) exposedFiles.push('sitemap.xml');
  if (exposureData?.securityTxt?.exists) exposedFiles.push('security.txt');

  const countBySev = (sev: FindingSeverity) => findings.filter((f) => f.severity === sev).length;
  const highCount = countBySev('high');
  const mediumCount = countBySev('medium');
  const lowCount = countBySev('low');
  const infoCount = countBySev('informational');

  const score = scan.score ?? null;
  const scoreAssessment = score === null
    ? 'Assessment in progress'
    : score >= 80
    ? 'Robust Configuration Hygiene'
    : score >= 60
    ? 'Standard Configuration'
    : score >= 40
    ? 'Action Recommended'
    : 'Attention Required';

  const keyTakeaways: string[] = [];

  if (httpData?.httpsEnforced) {
    keyTakeaways.push('HTTPS redirect enforcement is active across public HTTP entrypoints.');
  } else if (httpData?.httpsEnforced === false) {
    keyTakeaways.push('HTTP does not enforce redirection to HTTPS, allowing unencrypted transit.');
  }

  if (tlsData?.available) {
    if (typeof tlsData.daysUntilExpiration === 'number' && tlsData.daysUntilExpiration <= 30) {
      keyTakeaways.push(`TLS certificate is approaching expiration in ${tlsData.daysUntilExpiration} days.`);
    } else {
      keyTakeaways.push(`TLS encryption is active (${tlsData.protocol || 'Modern TLS'}).`);
    }
  } else {
    keyTakeaways.push('Direct TLS handshake on port 443 could not be established.');
  }

  if (dnsData?.dmarc?.record) {
    keyTakeaways.push('DMARC domain email policy is published.');
  } else {
    keyTakeaways.push('No DMARC email protection record was observed, leaving domain spoofing unmitigated.');
  }

  const missingHeaders = httpData?.missingSecurityHeaders || [];
  if (missingHeaders.length > 0) {
    keyTakeaways.push(`${missingHeaders.length} defensive HTTP security header${missingHeaders.length > 1 ? 's are' : ' is'} omitted.`);
  }

  if (highCount > 0) {
    keyTakeaways.push(`${highCount} high-priority security hygiene observation${highCount > 1 ? 's require' : ' requires'} administrative review.`);
  }

  return {
    domain: scan.domain,
    scanDate: scan.createdAt,
    status: scan.status,
    score,
    scoreAssessment,
    stats: {
      totalAssets: assets.length,
      subdomains,
      ipAddresses,
      asns,
      organizations,
      mailServers,
      certificates,
      approximateLocations,
    },
    observations: {
      httpsEnforced: httpData?.httpsEnforced ?? null,
      tlsActive: Boolean(tlsData?.available),
      tlsProtocol: tlsData?.protocol,
      certExpiresDays: tlsData?.daysUntilExpiration,
      hasSpf: Boolean(dnsData?.spf?.record),
      spfPolicy: dnsData?.spf?.record,
      hasDmarc: Boolean(dnsData?.dmarc?.record),
      dmarcPolicy: dnsData?.dmarc?.record,
      missingHeadersCount: missingHeaders.length,
      presentHeadersCount: Object.keys(httpData?.observedSecurityHeaders || {}).length,
      exposedFiles,
    },
    findingsSummary: {
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      informational: infoCount,
      total: findings.length,
    },
    keyTakeaways,
  };
}
