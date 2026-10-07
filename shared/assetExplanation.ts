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
  22,   // SSH (if exposed directly to public internet without ACL)
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

export function explainAsset(asset: Asset): AssetExplanation {
  const primaryEvidence = asset.evidence?.[0];
  const source = primaryEvidence?.source || 'Passive reconnaissance';
  const confidence = primaryEvidence?.confidence || 'high';

  switch (asset.type) {
    case 'DOMAIN':
      return {
        whatIsThis: 'The apex domain name registered under a top-level domain (TLD), serving as the foundational organizational identity and root of the public attack surface.',
        source,
        whyItMatters: 'The apex domain anchors all subordinate DNS delegations, TLS certificates, routing policies, and email exchange boundaries. A configuration flaw at the root cascades across every child asset.',
        confidence,
        technicalContext: `Target domain: ${asset.value}. Governed by authoritative zone records.`,
        recommendedAction: 'Maintain strict registrar access controls, enable multi-factor authentication on registrar accounts, and review authoritative nameserver delegations regularly.',
      };

    case 'SUBDOMAIN':
      return {
        whatIsThis: 'A child hostname delegated under the parent domain, typically routing to a distinct microservice, regional application, API endpoint, or testing environment.',
        source,
        whyItMatters: 'Subdomains expand the attack perimeter. Staging, legacy, or forgotten environments frequently receive fewer security updates than apex web services, making them attractive footholds for perimeter exploitation or DNS takeover.',
        confidence,
        technicalContext: `Discovered hostname: ${asset.value}. Sourced passively via Certificate Transparency logs without touching host servers.`,
        recommendedAction: 'Decommission obsolete subdomains, verify DNS records do not point to deleted third-party cloud buckets (subdomain takeover defense), and enforce uniform TLS and security headers.',
      };

    case 'IP':
      return {
        whatIsThis: 'An Internet Protocol address (IPv4 or IPv6) assigned to network infrastructure that routes incoming connections for the domain.',
        source,
        whyItMatters: 'Direct IP exposure reveals server hosting locations, cloud providers, and origin endpoints. Attackers seek unproxied origin IPs to bypass web application firewalls (WAF) or cloud DDoS filtering.',
        confidence,
        technicalContext: `Network address: ${asset.value}. Discovered via public DNS A or AAAA records.`,
        recommendedAction: 'If using an edge proxy or CDN (e.g., Cloudflare, Fastly), ensure origin IP access is restricted via firewall rules strictly to the CDN IP ranges to prevent WAF bypass.',
      };

    case 'ASN':
      return {
        whatIsThis: 'An Autonomous System Number (ASN) identifies an independently operated routing domain on the global Border Gateway Protocol (BGP) internet backbone.',
        source,
        whyItMatters: 'Informs architecture reviewers which network operator controls packet routing. Differentiates between self-hosted on-premises datacenters, public cloud infrastructure (AWS, GCP, Azure), and edge CDNs.',
        confidence,
        technicalContext: `Autonomous System: ${asset.value}. Mapped via public BGP routing tables.`,
        recommendedAction: 'Informational architecture insight. Confirm that network routing matches your organization’s approved hosting and transit providers.',
      };

    case 'ORGANIZATION':
      return {
        whatIsThis: 'The registered entity, cloud hosting company, or internet service provider (ISP) holding the IP allocation or domain ownership.',
        source,
        whyItMatters: 'Maps organizational boundaries and supply-chain dependencies. Identifies third-party infrastructure providers that process your application traffic.',
        confidence,
        technicalContext: `Entity attribution: ${asset.value}. Derived from public IP registry or WHOIS data. Attribution is an operational indicator, not absolute proof of legal ownership.`,
        recommendedAction: 'Verify that all attributed organizations correspond to authorized cloud, hosting, or CDN vendors contracted by your team.',
      };

    case 'NAMESERVER':
      return {
        whatIsThis: 'An authoritative Domain Name System (DNS) server responsible for publishing DNS records and resolving domain queries for all clients worldwide.',
        source,
        whyItMatters: 'Authoritative nameservers are the root of trust for your domain. If a nameserver is compromised, misconfigured, or responds with stale records, traffic can be redirected to unauthorized destinations.',
        confidence,
        technicalContext: `Authoritative DNS host: ${asset.value}. Discovered from parent zone NS delegations.`,
        recommendedAction: 'Utilize redundant, geographically distributed Anycast DNS providers with DDoS resilience, and enable registrar-level Registry Lock where available.',
      };

    case 'MAIL_SERVER':
      return {
        whatIsThis: 'A Mail Exchanger (MX) host designated in DNS to accept inbound email sent to user accounts under this domain.',
        source,
        whyItMatters: 'The presence of MX records confirms active email delivery. Domains that receive and send email require robust SPF, DKIM, and DMARC enforcement to prevent brand spoofing and executive impersonation.',
        confidence,
        technicalContext: `Mail gateway: ${asset.value}. Directs inbound SMTP traffic.`,
        recommendedAction: 'Enforce strict DMARC policies (p=reject or p=quarantine), configure TLS encryption for mail delivery (MTA-STS), and publish explicit SPF records.',
      };

    case 'CERTIFICATE':
      return {
        whatIsThis: 'An X.509 digital certificate that cryptographically binds a public key to the domain identity, enabling end-to-end encryption over TLS/HTTPS.',
        source,
        whyItMatters: 'Protects user sessions from interception and tampering. Expired certificates, weak signing algorithms (SHA-1), or over-broad wildcard certificates compromise cryptographic trust boundaries.',
        confidence,
        technicalContext: `Certificate identifier: ${asset.value}. Inspected directly from live TLS handshake negotiations.`,
        recommendedAction: 'Ensure automated certificate renewal (e.g., Let\'s Encrypt ACME with Certbot), monitor validity periods, and restrict issuance using DNS CAA records.',
      };

    case 'TECHNOLOGY':
      return {
        whatIsThis: 'A web server, runtime, framework, or content delivery platform identified through passive HTTP banner and header inspection.',
        source,
        whyItMatters: 'Publicly exposed server headers (such as Server or X-Powered-By) advertise technology versions to attackers, enabling them to target known software CVEs without trial-and-error scanning.',
        confidence,
        technicalContext: `Component: ${asset.value}. Identified from passive HTTP response fingerprints.`,
        recommendedAction: 'Suppress verbose server signature headers in your web server or reverse proxy configuration to deny reconnaissance intelligence to threat actors.',
      };

    case 'URL':
      return {
        whatIsThis: 'A public web endpoint or well-known metadata file verified during passive scan analysis (such as robots.txt, sitemap.xml, or security.txt).',
        source,
        whyItMatters: 'Public metadata paths can disclose sensitive directories or administrative paths. Publishing a valid security.txt standardizes vulnerability disclosure channels for ethical researchers.',
        confidence,
        technicalContext: `Endpoint: ${asset.value}. Probed via passive HTTP GET request.`,
        recommendedAction: 'Publish a standardized /.well-known/security.txt file detailing authorized reporting channels and PGP keys for security researchers.',
      };

    case 'GEOLOCATION': {
      const isAnycast = Boolean(asset.metadata?.anycastLikely);
      const isFailed = asset.metadata?.accuracy === 'failed' || asset.value.startsWith('Lookup failed:');

      if (isFailed) {
        return {
          whatIsThis: 'Geographic coordinate lookup attempted for the host IP address via passive IP intelligence providers.',
          source,
          whyItMatters: 'Provider lookups may be inconclusive due to upstream rate limits or unindexed private ranges. This does not indicate an infrastructure flaw.',
          confidence: 'low',
          technicalContext: asset.value,
          recommendedAction: 'No action required. Geolocation data is purely contextual infrastructure metadata.',
        };
      }

      return {
        whatIsThis: isAnycast
          ? 'An Anycast or CDN edge point of presence (PoP) where client requests terminate geographically close to the user.'
          : 'The estimated geographic network registration location of the infrastructure hosting this IP address.',
        source,
        whyItMatters: isAnycast
          ? 'Anycast routes traffic across hundreds of global datacenters. Geolocation represents an edge gateway, not the physical origin application server.'
          : 'Provides geographic routing context for regulatory compliance, data residency considerations, and latency optimization.',
        confidence: 'low',
        technicalContext: isAnycast
          ? `${asset.value} — Anycast / Edge CDN detected (Cloudflare, AWS, Fastly, Google, Akamai, or Azure).`
          : `${asset.value} — Approximate network location. IP geolocation reflects registry allocations and network routing, never physical individual persons.`,
        recommendedAction: isAnycast
          ? 'Verify that edge caching rules protect origin servers from unnecessary pass-through load.'
          : 'Ensure data processing locations comply with your organizational data residency obligations (e.g., GDPR).',
      };
    }

    case 'PORT': {
      const portNum = Number(asset.metadata?.port ?? asset.value.split(':')[1]);
      const isRisky = RISKY_PORTS.has(portNum);
      const isWeb = WEB_PORTS.has(portNum);

      if (isRisky) {
        return {
          whatIsThis: `An exposed service port (${portNum}) observed accepting public connections based on Shodan's passive internet-wide scan records.`,
          source: 'Shodan InternetDB',
          whyItMatters: `Port ${portNum} is a high-risk service port (database, remote desktop, shell, or internal messaging). Exposing internal management or database services directly to the public internet significantly heightens the risk of brute-force attacks, credential stuffing, and remote code execution.`,
          confidence: 'high',
          technicalContext: `Observed port: ${asset.value}. Tagged in historical internet scan records.`,
          recommendedAction: `Restrict port ${portNum} immediately. Database and administrative ports should never listen on public interfaces; isolate them behind a VPN, bastion host, or private VPC subnet.`,
          isHighRisk: true,
        };
      }

      if (isWeb) {
        return {
          whatIsThis: `Standard web service port (${portNum}) observed responding to public internet traffic.`,
          source: 'Shodan InternetDB',
          whyItMatters: `Standard web ports (80 HTTP, 443 HTTPS) are standard for public web applications. Informational observation confirming public web availability.`,
          confidence: 'high',
          technicalContext: `Observed port: ${asset.value}. Normal web application perimeter.`,
          recommendedAction: 'Ensure port 80 permanently redirects to port 443 with HSTS enabled, and maintain active TLS certificate management.',
          isHighRisk: false,
        };
      }

      return {
        whatIsThis: `A non-standard network port (${portNum}) observed accepting connections in Shodan's internet database.`,
        source: 'Shodan InternetDB',
        whyItMatters: `Non-standard open ports often indicate secondary microservices, custom admin consoles, or staging utilities that may lack standard security controls.`,
        confidence: 'high',
        technicalContext: `Observed port: ${asset.value}.`,
        recommendedAction: `Audit whether port ${portNum} is intentionally public. If not required for public visitors, restrict access with firewall rules.`,
        isHighRisk: false,
      };
    }

    case 'VULNERABILITY':
      return {
        whatIsThis: `A Common Vulnerabilities and Exposures (CVE) record (${asset.value}) identified by Shodan against software running on this host.`,
        source: 'Shodan InternetDB',
        whyItMatters: `This host is running a software version known to be vulnerable to documented exploitation techniques. Publicly exposed CVEs are heavily targeted by automated botnets and malicious actors.`,
        confidence: 'high',
        technicalContext: `Vulnerability: ${asset.value}. Sourced from Shodan InternetDB's passive vulnerability correlation records.`,
        recommendedAction: `Review the CVE advisory for ${asset.value} and upgrade or patch the affected software daemon immediately. Apply vendor mitigation instructions if immediate patching is not feasible.`,
        isHighRisk: true,
      };

    case 'DNSSEC':
      return {
        whatIsThis: 'Domain Name System Security Extensions (DNSSEC) cryptographic validation status for this domain.',
        source: 'DNS query (Google DoH / Cloudflare DoH)',
        whyItMatters: 'DNSSEC uses cryptographic digital signatures (DNSKEY and DS records) to authenticate DNS responses. It prevents cache poisoning and man-in-the-middle DNS spoofing attacks by ensuring DNS answers cannot be forged in transit.',
        confidence: 'high',
        technicalContext: `Observed signed DNSKEY/DS records validating the domain zone.`,
        recommendedAction: 'Maintain current DNSSEC keys and coordinate parent zone DS record updates when rotating Key Signing Keys (KSK).',
        isHighRisk: false,
      };

    default:
      return {
        whatIsThis: 'An observable infrastructure asset identified during passive attack surface reconnaissance.',
        source,
        whyItMatters: 'Contributes to the total observable attack surface perimeter of the target domain.',
        confidence,
        technicalContext: `Asset: ${asset.value}.`,
        recommendedAction: 'Review asset necessity and apply least-exposure defensive principles.',
      };
  }
}
