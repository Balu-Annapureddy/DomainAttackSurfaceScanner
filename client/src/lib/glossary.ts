export interface GlossaryEntry {
  term: string;
  category: 'dns' | 'tls' | 'http' | 'network' | 'general';
  shortExplanation: string;
  whatIsThis: string;
  whyItMatters: string;
  whatDoesItMean: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  attack_surface: {
    term: 'Attack Surface',
    category: 'general',
    shortExplanation: 'The publicly observable systems, domains, IPs, services, and relationships associated with a target.',
    whatIsThis: 'The sum of all public touchpoints that an external entity or adversary can observe on the internet without having internal network access.',
    whyItMatters: 'Organizations cannot defend assets they do not know exist. Forgotten subdomains, old staging sites, or misrouted DNS records often become vectors for takeover.',
    whatDoesItMean: 'Mapping the attack surface reveals what is exposed to the world, helping security teams audit and decommission unnecessary exposure.',
  },
  certificate_transparency: {
    term: 'Certificate Transparency (CT)',
    category: 'tls',
    shortExplanation: 'Public append-only cryptographic logs of all digital certificates issued for domains on the internet.',
    whatIsThis: 'An open framework mandated by major browsers where Certificate Authorities (CAs) must log every issued TLS certificate to public, cryptographically verifiable logs.',
    whyItMatters: 'Because all issued certificates are publicly logged, CT logs allow defenders to discover legitimate and rogue subdomains without intrusive brute-forcing.',
    whatDoesItMean: 'Subdomains discovered via CT existed in public certificate records; however, they may or may not currently be active or resolve to live IP addresses.',
  },
  asn: {
    term: 'Autonomous System Number (ASN)',
    category: 'network',
    shortExplanation: 'A globally unique identifier for a connected network/organization that routes IP prefixes on the internet.',
    whatIsThis: 'The internet is a collection of autonomous systems operated by ISPs, cloud providers (AWS, Cloudflare, Google), and enterprises. Each network has a unique ASN (e.g. AS13335 for Cloudflare).',
    whyItMatters: 'Identifying the ASN of target IP addresses reveals which hosting provider, cloud vendor, or telecommunications carrier operates the physical infrastructure.',
    whatDoesItMean: 'Attribution to an ASN indicates the transit network or cloud provider hosting the IP, not necessarily the legal owner of the domain.',
  },
  dns_mx: {
    term: 'DNS MX Record',
    category: 'dns',
    shortExplanation: 'Mail Exchanger record showing which mail servers receive email on behalf of the domain.',
    whatIsThis: 'A DNS record type that specifies the mail server responsible for accepting incoming email messages on behalf of a domain name, along with a preference priority.',
    whyItMatters: 'MX records reveal email service providers (e.g. Google Workspace, Microsoft 365, Proofpoint) and determine the necessity of email authentication records (SPF, DMARC).',
    whatDoesItMean: 'If MX records are present, the domain handles incoming email and requires strict SPF and DMARC enforcement to prevent spoofing.',
  },
  spf: {
    term: 'Sender Policy Framework (SPF)',
    category: 'dns',
    shortExplanation: 'An email validation standard that publishes which IP addresses are authorized to send mail for the domain.',
    whatIsThis: 'A DNS TXT record starting with "v=spf1" listing authorized sending hosts and mail servers.',
    whyItMatters: 'Without SPF, malicious actors can send fraudulent phishing emails that appear to originate directly from your domain.',
    whatDoesItMean: '“SPF was not observed” means no valid v=spf1 TXT record was found in public DNS. It does not mean mail cannot be sent, but rather that receivers cannot verify authorized senders.',
  },
  dmarc: {
    term: 'DMARC',
    category: 'dns',
    shortExplanation: 'Domain-based Message Authentication, Reporting, and Conformance policy protecting against email spoofing.',
    whatIsThis: 'A DNS TXT record at _dmarc.<domain> that specifies how receiving mail servers should handle messages that fail SPF or DKIM checks (none, quarantine, or reject).',
    whyItMatters: 'DMARC provides reporting and enforcement instructions to global email providers, neutralizing domain impersonation and executive email spoofing.',
    whatDoesItMean: 'A policy of p=none monitors email without blocking; p=quarantine moves failures to spam; p=reject instructs receivers to drop unauthorized messages immediately.',
  },
  hsts: {
    term: 'Strict-Transport-Security (HSTS)',
    category: 'http',
    shortExplanation: 'A security header instructing browsers to strictly interact over secure HTTPS connections only.',
    whatIsThis: 'An HTTP response header (Strict-Transport-Security: max-age=...) that forces compliant browsers to automatically convert any http:// requests to https:// before sending.',
    whyItMatters: 'Protects users against SSL-stripping and man-in-the-middle attacks when connecting over insecure public Wi-Fi networks.',
    whatDoesItMean: 'If HSTS is not observed, visitors could theoretically be coerced into plaintext HTTP connections before being redirected.',
  },
  csp: {
    term: 'Content-Security-Policy (CSP)',
    category: 'http',
    shortExplanation: 'A security header that restricts the scripts, styles, and resources browsers are permitted to load.',
    whatIsThis: 'A powerful defense-in-depth header that defines a whitelist of trusted sources for JavaScript, CSS, images, and embedded frames.',
    whyItMatters: 'Significantly mitigates Cross-Site Scripting (XSS), clickjacking, and unauthorized data exfiltration attacks.',
    whatDoesItMean: 'Absence of CSP does not mean the site has an XSS vulnerability, but rather that it lacks a browser-enforced secondary safety net if injection occurs.',
  },
  approximate_geolocation: {
    term: 'Approximate Infrastructure Geolocation',
    category: 'network',
    shortExplanation: 'Estimated regional network point of presence or datacenter location based on IP registry records.',
    whatIsThis: 'Mapping public IP addresses to geographic coordinates using regional internet registries (RIRs) and ISP network routing announcements.',
    whyItMatters: 'Helps understand data sovereignty, edge CDN distribution, and cross-border infrastructure exposure.',
    whatDoesItMean: 'Coordinates represent network datacenters, points of presence (POPs), or ISP routers—NEVER physical offices, residences, or individuals.',
  },
  passive_osint: {
    term: 'Passive OSINT Epistemology',
    category: 'general',
    shortExplanation: 'A non-intrusive reconnaissance methodology relying solely on publicly observable data.',
    whatIsThis: 'Passive reconnaissance gathers intelligence without sending unauthorized probes, scanning closed ports, or attempting exploitation.',
    whyItMatters: 'Safe, legal, and non-disruptive to production systems, while still providing valuable visibility into external exposure.',
    whatDoesItMean: 'CRITICAL RULE: “We did not observe X” ≠ “X does not exist.” If a firewall blocks port 80 or crt.sh times out, it means the check was unobservable, not that a flaw exists.',
  },
};
