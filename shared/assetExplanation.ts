import type { Asset, Evidence } from './types';

export interface AssetExplanation {
  whatIsThis: string;
  source: string;
  whyItMatters: string;
  confidence: Evidence['confidence'];
  technicalContext?: string;
  recommendedAction?: string;
  isHighRisk?: boolean;
}

const RISKY_PORTS = new Set([
  21,   // FTP
  22,   // SSH
  23,   // Telnet
  25,   // SMTP
  110,  // POP3
  143,  // IMAP
  445,  // SMB
  1433, // MSSQL
  1521, // Oracle DB
  3306, // MySQL / MariaDB
  3389, // RDP
  5432, // PostgreSQL
  5900, // VNC
  6379, // Redis
  8086, // InfluxDB
  9200, // Elasticsearch
  27017,// MongoDB
]);

const WEB_PORTS = new Set([80, 443, 8080, 8443, 2052, 2053, 2082, 2083, 2086, 2087]);

/**
 * Explains an asset in plain language per Phase 4 writing rules:
 * - One idea per sentence.
 * - Inline plain-language gloss for acronyms/technical terms.
 * - "This means..." framing.
 * - No unevidenced marketing jargon.
 */
export function explainAsset(asset: Asset): AssetExplanation {
  const primaryEvidence = asset.evidence?.[0];
  const source = primaryEvidence?.source || 'Passive reconnaissance';
  const confidence = primaryEvidence?.confidence || 'high';

  switch (asset.type) {
    case 'DOMAIN':
      return {
        whatIsThis: 'This is the apex domain (the main website address registered with a domain registry). It serves as the foundational root of the entire public perimeter.',
        source,
        whyItMatters: 'All subdomains, security certificates, and email routing anchor to this root domain. This means any security misconfiguration at the root domain affects every service under it.',
        confidence,
        technicalContext: `Target domain: ${asset.value}. Governed by authoritative zone records.`,
        recommendedAction: 'Enable multi-factor authentication (MFA) on your domain registrar account. Review authoritative nameservers regularly to ensure only authorized servers direct your traffic.',
      };

    case 'SUBDOMAIN':
      return {
        whatIsThis: 'This is a child hostname delegated under the parent domain. It typically points to a distinct service, regional portal, API (Application Programming Interface), or staging environment.',
        source,
        whyItMatters: 'Subdomains expand the attack perimeter. This means older or forgotten test environments may run unpatched software, making them easy targets for intruders or domain takeover.',
        confidence,
        technicalContext: `Discovered hostname: ${asset.value}. Sourced passively via Certificate Transparency logs without touching host servers.`,
        recommendedAction: 'Decommission DNS records for subdomains that are no longer in active use. Make sure active subdomains enforce the same HTTPS encryption and security headers as the apex domain.',
      };

    case 'IP':
      return {
        whatIsThis: 'This is an Internet Protocol address (IPv4 or IPv6). It is the numerical network address that directs internet traffic to the host server.',
        source,
        whyItMatters: 'Direct IP exposure reveals the physical or cloud host operating the service. This means attackers can try to bypass web application firewalls (WAF) by connecting directly to the origin IP address.',
        confidence,
        technicalContext: `Network address: ${asset.value}. Discovered via public DNS A or AAAA records.`,
        recommendedAction: 'If using a proxy or CDN (Content Delivery Network like Cloudflare), configure firewall rules to restrict direct connections so only CDN traffic reaches this origin IP address.',
      };

    case 'ASN':
      return {
        whatIsThis: 'This is an Autonomous System Number (ASN, a unique identifier for a large network). It identifies the network operator managing internet routing for this domain.',
        source,
        whyItMatters: 'The ASN indicates which organization controls backbone internet routing. This means you can verify whether traffic is handled by your approved cloud provider or a third-party host.',
        confidence,
        technicalContext: `Autonomous System: ${asset.value}. Mapped via public BGP (Border Gateway Protocol) routing tables.`,
        recommendedAction: 'Confirm that the network operator listed matches your organization’s authorized cloud or hosting providers.',
      };

    case 'ORGANIZATION':
      return {
        whatIsThis: 'This is the organization, cloud provider, or ISP (Internet Service Provider) that owns the network IP block or domain registration.',
        source,
        whyItMatters: 'This maps third-party vendor dependencies handling your network traffic. This means you can identify external companies that process visitor requests.',
        confidence,
        technicalContext: `Entity attribution: ${asset.value}. Derived from public IP registry or WHOIS data. Attribution is an operational indicator, not absolute proof of legal ownership.`,
        recommendedAction: 'Verify that all attributed organizations correspond to authorized cloud, hosting, or CDN vendors contracted by your team.',
      };

    case 'NAMESERVER':
      return {
        whatIsThis: 'This is an authoritative DNS (Domain Name System) nameserver. It is responsible for publishing DNS records and directing visitors to the correct server IP addresses.',
        source,
        whyItMatters: 'Nameservers control all traffic routing for your domain. This means if a nameserver is misconfigured or unavailable, visitors will not be able to reach your website.',
        confidence,
        technicalContext: `Authoritative DNS host: ${asset.value}. Discovered from parent zone NS delegations.`,
        recommendedAction: 'Use at least two separate nameservers so that if one server goes down, the other keeps your domain reachable.',
      };

    case 'MAIL_SERVER':
      return {
        whatIsThis: 'This is a Mail Exchanger (MX) server designated in DNS to accept inbound email for this domain.',
        source,
        whyItMatters: 'The presence of an MX record confirms that this domain receives email. This means the domain requires email authentication records (SPF and DMARC) so scammers cannot send spoofed emails pretending to be you.',
        confidence,
        technicalContext: `Mail gateway: ${asset.value}. Directs inbound SMTP (Simple Mail Transfer Protocol) traffic.`,
        recommendedAction: 'Publish strict SPF and DMARC policies in DNS to prevent unauthorized senders from spoofing your email address.',
      };

    case 'CERTIFICATE':
      return {
        whatIsThis: 'This is a digital TLS (Transport Layer Security) certificate. It cryptographically validates the website identity and encrypts traffic over HTTPS.',
        source,
        whyItMatters: 'The certificate protects user sessions from eavesdropping and tampering. This means if a certificate expires or uses weak settings, browsers will display warning screens and block visitors.',
        confidence,
        technicalContext: `Certificate identifier: ${asset.value}. Inspected directly from live TLS handshake negotiations.`,
        recommendedAction: 'Enable automated certificate renewal to ensure the certificate never lapses before replacement.',
      };

    case 'TECHNOLOGY':
      return {
        whatIsThis: 'This is a web server or software framework identified from public HTTP response headers.',
        source,
        whyItMatters: 'Publicly displaying software version headers advertises your technology stack. This means attackers can look up known vulnerabilities for those specific versions without testing.',
        confidence,
        technicalContext: `Component: ${asset.value}. Identified from passive HTTP response fingerprints.`,
        recommendedAction: 'Configure your web server to remove software version numbers from response headers.',
      };

    case 'URL':
      return {
        whatIsThis: 'This is a public web path or metadata file (such as robots.txt or security.txt) observed on the domain.',
        source,
        whyItMatters: 'Public metadata files help communicate website policies. This means publishing a security.txt file gives ethical security researchers an authorized contact method to report vulnerabilities.',
        confidence,
        technicalContext: `Endpoint: ${asset.value}. Probed via passive HTTP GET request.`,
        recommendedAction: 'Maintain a clear security.txt file at /.well-known/security.txt with security contact details.',
      };

    case 'GEOLOCATION': {
      const isAnycast = Boolean(asset.metadata?.anycastLikely);
      const isFailed = asset.metadata?.accuracy === 'failed' || asset.value.startsWith('Lookup failed:');

      if (isFailed) {
        return {
          whatIsThis: 'This is a geographic location lookup attempted for this IP address.',
          source,
          whyItMatters: 'Public registry lookup data was unavailable for this network range. This means geographic context is limited, but it does not indicate any security problem.',
          confidence: 'low',
          technicalContext: asset.value,
          recommendedAction: 'No action required. Geolocation data is purely contextual infrastructure metadata.',
        };
      }

      return {
        whatIsThis: isAnycast
          ? 'This is an Anycast or CDN edge point of presence (a distributed network where traffic terminates near the user).'
          : 'This is the estimated geographic registration location of the network hosting this IP address.',
        source,
        whyItMatters: isAnycast
          ? 'Anycast distributes traffic across hundreds of global datacenters. This means the location marker shows network registration rather than one single origin server.'
          : 'Provides geographic routing context for regulatory compliance and data residency. This means you can confirm where your traffic is being processed.',
        confidence: 'low',
        technicalContext: isAnycast
          ? `${asset.value} — Anycast / Edge CDN detected.`
          : `${asset.value} — Approximate network location. IP geolocation reflects registry allocations and network routing, never physical individual persons.`,
        recommendedAction: isAnycast
          ? 'Verify that edge caching rules protect origin servers from unnecessary pass-through load.'
          : 'Ensure data processing locations comply with your organizational data residency obligations (such as GDPR).',
      };
    }

    case 'PORT': {
      const portNum = Number(asset.metadata?.port ?? asset.value.split(':')[1]);
      const isRisky = RISKY_PORTS.has(portNum);
      const isWeb = WEB_PORTS.has(portNum);

      if (isRisky) {
        return {
          whatIsThis: `Port ${portNum} is an exposed service port (such as a database or remote management port) observed on this host.`,
          source: 'Shodan InternetDB',
          whyItMatters: `Port ${portNum} is a high-risk service port. Exposing database or administrative services directly to the public internet means automated scanners can attempt password attacks against the service.`,
          confidence: 'high',
          technicalContext: `Observed port: ${asset.value}. Tagged in historical internet scan records.`,
          recommendedAction: `Restrict port ${portNum} immediately. Database and administrative ports should never listen on public interfaces; isolate them behind a private VPN or firewall.`,
          isHighRisk: true,
        };
      }

      if (isWeb) {
        return {
          whatIsThis: `Standard web service port (${portNum}) observed responding to public internet traffic.`,
          source: 'Shodan InternetDB',
          whyItMatters: `Standard web ports (80 HTTP, 443 HTTPS) allow visitors to access the website. This means normal web traffic is functioning as expected.`,
          confidence: 'high',
          technicalContext: `Observed port: ${asset.value}. Normal web application perimeter.`,
          recommendedAction: 'Ensure unencrypted port 80 traffic permanently redirects to encrypted port 443 with HSTS enabled.',
          isHighRisk: false,
        };
      }

      return {
        whatIsThis: `A non-standard network port (${portNum}) observed accepting connections in public internet scan records.`,
        source: 'Shodan InternetDB',
        whyItMatters: `Non-standard open ports often run secondary microservices or internal tools. This means they may lack standard security controls like encryption or access logging.`,
        confidence: 'high',
        technicalContext: `Observed port: ${asset.value}.`,
        recommendedAction: `Audit whether port ${portNum} is required for public visitors. If not needed, block it with firewall rules.`,
        isHighRisk: false,
      };
    }

    case 'VULNERABILITY':
      return {
        whatIsThis: `This is a recorded CVE (Common Vulnerabilities and Exposures) record (${asset.value}) identified in software running on this host.`,
        source: 'Shodan InternetDB',
        whyItMatters: `This host runs a software version with documented security flaws. This means automated exploit tools actively search for and target this vulnerability.`,
        confidence: 'high',
        technicalContext: `Vulnerability: ${asset.value}. Sourced from Shodan InternetDB's passive vulnerability correlation records.`,
        recommendedAction: `Review the security advisory for ${asset.value} and update or patch the affected software immediately.`,
        isHighRisk: true,
      };

    case 'DNSSEC':
      return {
        whatIsThis: 'This is the DNSSEC (Domain Name System Security Extensions) cryptographic validation status for this domain.',
        source: 'DNS query (Google DoH / Cloudflare DoH)',
        whyItMatters: 'DNSSEC uses digital cryptographic signatures to verify domain lookup responses. This means attackers cannot alter DNS records in transit to redirect visitors to malicious servers.',
        confidence: 'high',
        technicalContext: `Observed signed DNSKEY/DS records validating the domain zone.`,
        recommendedAction: 'Maintain current DNSSEC keys and coordinate parent zone record updates when rotating keys.',
        isHighRisk: false,
      };

    case 'CLOUD_STORAGE':
      return {
        whatIsThis: `This is a public cloud storage container endpoint (${asset.value}) matching this domain's naming pattern.`,
        source: 'Passive cloud storage namespace probe (HEAD request only)',
        whyItMatters: 'Cloud storage containers can inadvertently expose internal backups or static files. This means anyone with the bucket URL could view files if permissions are misconfigured.',
        confidence: 'high',
        technicalContext: `Target bucket: ${asset.value}. Verified strictly via non-invasive HTTP HEAD existence checks without inspecting bucket objects.`,
        recommendedAction: 'Check bucket permissions in your cloud provider console. Enforce "Block Public Access" unless intentionally hosting a public website.',
        isHighRisk: asset.metadata?.publiclyAccessible === true,
      };

    case 'DOCUMENT_METADATA':
      return {
        whatIsThis: `This is document metadata (embedded properties like software names and versions) extracted from a public file (${asset.value}).`,
        source: 'Publicly referenced document inspection',
        whyItMatters: 'Public files often include creator software names and internal file paths. This means external observers can profile your internal workstation software.',
        confidence: 'medium',
        technicalContext: `Document: ${asset.value}. Extracted from public document links discovered on the target web surface.`,
        recommendedAction: 'Use metadata stripping tools before publishing documents on the public website.',
        isHighRisk: false,
      };

    case 'BREACH_EXPOSURE':
      return {
        whatIsThis: `This is a public breach disclosure record (${asset.value}) aggregated from historical security incident indexes.`,
        source: 'HaveIBeenPwned public breach index',
        whyItMatters: 'Historical breach records show where credentials associated with this domain were exposed in past third-party breaches. This means legacy passwords could pose a risk if employees reuse passwords without multi-factor authentication.',
        confidence: 'high',
        technicalContext: `Public record: ${asset.value}. Tracks breach metadata, count, and disclosure date only—never individual credentials.`,
        recommendedAction: 'Enforce multi-factor authentication (MFA) across all organizational accounts so that stolen passwords alone cannot grant access.',
        isHighRisk: false,
      };

    default:
      return {
        whatIsThis: 'This is an observable infrastructure asset identified during passive attack surface reconnaissance.',
        source,
        whyItMatters: 'It forms part of the visible public perimeter for this domain.',
        confidence,
        technicalContext: `Asset: ${asset.value}.`,
        recommendedAction: 'Review whether this asset needs to be publicly accessible.',
      };
  }
}
